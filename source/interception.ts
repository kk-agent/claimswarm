import {
  InterceptionHandler,
  type AgentEvent,
  type InterceptionResult,
} from "@mozaik-ai/core";
import type { ClaimswarmState } from "./state.js";

const OVERCONFIDENT = /\b(settled|proven beyond doubt)\b/i;

export class ClaimswarmInterceptor extends InterceptionHandler {
  constructor(private readonly state: ClaimswarmState) {
    super();
  }

  override canHandle(event: AgentEvent): boolean {
    return event.kind === "model_message";
  }

  override handle(event: AgentEvent): InterceptionResult {
    if (event.kind !== "model_message") {
      return { action: "pass" };
    }
    const text = event.message.content
      .map((part) => ("text" in part ? part.text : ""))
      .join(" ");
    if (!OVERCONFIDENT.test(text)) {
      return { action: "pass" };
    }
    this.state.markInterception(
      `Rewrote overconfident ${event.agent.name} draft so the swarm keeps arguing.`,
    );
    return {
      action: "rewrite",
      event: {
        kind: "message_received",
        message: {
          ...event.message,
          content: [
            {
              type: "text",
              text: `${event.agent.name} drafted an overconfident close ("settled" / "proven beyond doubt"). Keep the disagreement live and finish your stance tool.`,
            },
          ],
        },
      },
    };
  }
}
