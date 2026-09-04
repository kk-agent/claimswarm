# TASK: Claimswarm — concurrent Mozaik hackathon entry

## 1. Goal & Scope
* **Objective:** Ship a demoable TypeScript app on `@mozaik-ai/core` ^4.0.5 where several agents `join()` one runtime and run at the same time, sharing events and coordinating.
* **Context:** JigJoy × daily.dev × Hyperskill hackathon. Official brief (build.jigjoy.ai, 2026-09-04) is one open brief: genuine concurrency, not a sequential pipeline. Product: Claimswarm — parallel hypothesis testing / live ops room.
* **Scope:** New project from official `jigjoy-ai/cli-agent-starter`. Current package is ^4.0.5 (not ^3.13). Follow package APIs: `defineRuntime`, `createAgent`/`createHuman`, situation handlers, `runLoop(..., InterceptionHandler)`, events `function_call.started` / `function_call.completed` / `interception.started`.
 * *Initial check:* Empty repo except seeded README. Starter copied conceptually, then rewritten into a swarm (not one TerminalAgent).

## 2. Execution Plan
- [x] Verify official brief vs product (no contradiction — keep Claimswarm)
- [x] Official rules 4 Sep 2026: @mozaik-ai/core, ≥2 concurrent agents, README concurrency write-up
- [x] Runtime + shared board state
- [x] Three specialist agents + sentry interceptor + synthesizer + mid-run human
- [x] Simulated inference runner (dry-run) + live OpenAI path
- [x] Ink ops-room UI + headless `npm run demo`
- [x] Tests for join, interceptor, function-call reactions, abort
- [x] README + CONCURRENCY.md (submit-form paste)
- [x] Prove with `npm test` and `npm run demo`; commit and push

## 3. Definition of Done (Success Verification)
* **Expected Outcome:** `npm install && npm run demo` shows ≥3 agents with overlapping `inference.started` timestamps; sentry intercepts an overconfident `model_message`; another participant reacts to `function_call.started` before the caller finishes its loop.
* **Verification Method:** `npm test` (real wiring) and `npm run demo` (prints overlap proof and exits 0 only if proven).
* **Proof Artifact:** `npm test` 5/5; `npm run demo` overlap third start +3ms before first complete +29ms; `interception.started` at +54ms.

## 4. Post-Task Reflection
* **What was done:** Claimswarm on `@mozaik-ai/core` ^4.0.5: three overlapping specialists, live Sentry/`InterceptionHandler`, Synthesizer board, mid-run inject, Auditor reassignment. Official rules (4 Sep 2026) covered via CONCURRENCY.md submit-form paste.
* **Why it was needed:** Rules disqualify a single-agent project and require a written concurrency explanation.
* **How it was tested:** `npx tsc --noEmit`, `npm test`, `npm run demo`.
