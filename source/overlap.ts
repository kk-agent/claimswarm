import type { Runtime } from "@mozaik-ai/core";
import type { ClaimswarmState } from "./state.js";

const SPECIALISTS = new Set(["Steelman", "Redteam", "Contextualist"]);

export type OverlapProof = {
  starts: Array<{ agent: string; atMs: number }>;
  completes: Array<{ agent: string; atMs: number }>;
};

export function attachOverlapRecorder(runtime: Runtime, state: ClaimswarmState): OverlapProof {
  const proof: OverlapProof = { starts: [], completes: [] };
  const origin = Date.now();

  runtime.subscribe((event) => {
    if (event.kind === "function_call.started" && SPECIALISTS.has(event.agent.name)) {
      proof.starts.push({ agent: event.agent.name, atMs: Date.now() - origin });
    }
    if (event.kind === "function_call.completed" && SPECIALISTS.has(event.agent.name)) {
      proof.completes.push({ agent: event.agent.name, atMs: Date.now() - origin });
    }
    if (event.kind === "agent.left" && event.agent.name === "Scout") {
      state.appendAudit("Scout left; Coordinator will join Auditor on the same runtime.");
    }
  });

  return proof;
}

export function summarizeOverlap(proof: OverlapProof) {
  const firstComplete = proof.completes[0];
  const lastStart = proof.starts.at(-1);
  const overlapping =
    proof.starts.length >= 2 &&
    Boolean(firstComplete && lastStart && lastStart.atMs < firstComplete.atMs);
  return {
    starts: proof.starts,
    completes: proof.completes,
    overlapping,
    detail: overlapping
      ? `Last specialist start (+${lastStart?.atMs}ms) happened before first specialist complete (+${firstComplete?.atMs}ms).`
      : "Specialist starts did not overlap a still-open function call.",
  };
}
