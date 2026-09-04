import type { Runtime } from "@mozaik-ai/core";
import type { ClaimswarmState } from "./state.js";

const SPECIALISTS = new Set(["Steelman", "Redteam", "Contextualist"]);

export function installSentryWatch(runtime: Runtime, state: ClaimswarmState) {
  runtime.subscribe((event) => {
    if (event.kind !== "function_call.started") return;
    if (!SPECIALISTS.has(event.agent.name)) return;
    if (state.sentryNote) return;
    state.markSentry(
      `Sentry saw ${event.agent.name} enter ${event.functionCall.name} while other specialists are still in-loop.`,
    );
  });
}

export function installSynthesisBoard(runtime: Runtime, state: ClaimswarmState) {
  runtime.subscribe((event) => {
    if (event.kind !== "function_call.completed") return;
    if (!SPECIALISTS.has(event.agent.name)) return;
    const latest = state.snapshot().findings.at(-1);
    if (!latest) return;
    state.setBoard(`${latest.agent} posted a ${latest.stance} note; board still open.`);
  });
}

export function installHumanInjection(runtime: Runtime, state: ClaimswarmState) {
  runtime.subscribe((event) => {
    if (event.kind !== "message.sent") return;
    if (event.agent.name !== "Human") return;
    const text = event.message.content
      .map((part) => ("text" in part ? part.text : ""))
      .join(" ");
    if (text.trim().length === 0) return;
    state.injectHuman(text);
  });
}
