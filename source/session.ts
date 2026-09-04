import { createHuman, type Runtime } from "@mozaik-ai/core";
import { getLogger } from "./agents/logger.js";
import { createCoordinator } from "./agents/coordinator.js";
import { createSentry } from "./agents/sentry.js";
import { createSpecialists } from "./agents/specialists.js";
import { createSynthesizer } from "./agents/synthesizer.js";
import { createClaimswarmState } from "./state.js";
import type { ClaimswarmState } from "./state.js";
import { installHumanInjection, installSentryWatch, installSynthesisBoard } from "./situations.js";
import { attachOverlapRecorder, type OverlapProof } from "./overlap.js";

export type ClaimswarmSession = {
  runtime: Runtime;
  state: ClaimswarmState;
  overlap: OverlapProof;
};

export function bootstrapSession(runtime: Runtime): ClaimswarmSession {
  const state = createClaimswarmState();
  const overlap = attachOverlapRecorder(runtime, state);
  getLogger(runtime);
  createSpecialists(runtime, state);
  createSentry(runtime, state);
  createSynthesizer(runtime, state);
  createCoordinator(runtime, state);
  createHuman(runtime, { name: "Human" });
  installSentryWatch(runtime, state);
  installSynthesisBoard(runtime, state);
  installHumanInjection(runtime, state);
  return { runtime, state, overlap };
}
