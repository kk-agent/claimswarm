# Claimswarm

A [Mozaik Hackathon 2026](https://build.jigjoy.ai/) entry: a **concurrent** claim-investigation swarm, not a sequential agent pipeline.

**Submit-form paste:** [CONCURRENCY.md](./CONCURRENCY.md) is the written answer to “How do the agents run concurrently?” Official rules (updated 4 Sep 2026): https://build.jigjoy.ai/rules — submit at https://build.jigjoy.ai/submit

You state a claim. Steelman, Redteam, and Contextualist `join()` one runtime and start `runLoop` at the same time. Sentry reacts to `function_call.started` **while those loops are still running**. A policy `InterceptionHandler` aborts overconfident settlements mid-loop. Synthesizer updates a live board as `function_call.completed` arrives. The operator can inject a message mid-run. When Scout leaves, Auditor `join()`s — reassignment is a situation handler, not a controller.

Built from the official [`cli-agent-starter`](https://github.com/jigjoy-ai/cli-agent-starter) on **`@mozaik-ai/core` ^4.0.5** (current on npm; the older `^3.13` / `AgenticEnvironment` names are not what this package exports).

Organizers: JigJoy × daily.dev × Hyperskill. Docs: https://docs.jigjoy.ai/

## How the agents run concurrently

This section is what the submit form asks for. The paste-ready version is [CONCURRENCY.md](./CONCURRENCY.md).

Claimswarm is a Mozaik v4 swarm (`defineRuntime` + `join()` + fire-and-forget `runLoop`), not a sequential pipeline.

Three specialist agents — Steelman, Redteam, and Contextualist — each `join()` one runtime and keep their own `ModelContext`. When the operator `sendMessage`s a claim, every specialist’s `message.sent` handler calls `runLoop` and returns immediately. Mozaik does not await `runLoop` or `processor.apply`, so the three loops think, call `cite_evidence`, and answer at the same time. `npm run demo` prints ISO timestamps and exits 0 only if the third `inference.started` occurs before the first of those inferences completes.

They share the environment, not memory. Shared data lives on `ClaimswarmState` (claim, evidence board, sentry flags, roster) plus the event bus. Coordination is reaction:

- **Sentry** is a joined policy participant. On another agent’s `function_call.started` it flags the call while that caller is still inside its loop.
- Each specialist’s `runLoop` carries an **`InterceptionHandler`**. If a `model_message` tries to declare the claim “settled” / “proven beyond doubt”, the handler rewrites the transition to `message_received` mid-loop (`interception.started` / `interception.finished`) and that agent infers again. Other specialists are not paused.
- **Synthesizer** listens to `function_call.started`, `function_call.completed`, and `model.answer` and updates the live board as events arrive. It does not wait for a join barrier.
- The operator can `sendMessage` again mid-run; new loops start while earlier ones are still open.
- **Coordinator** watches `participant.left`. When Scout leaves, Auditor `join()`s the same runtime and starts investigating.

Nothing is one agent with tools in a for-loop. A join-and-wait fan-out cannot produce the overlap proof the demo requires.
