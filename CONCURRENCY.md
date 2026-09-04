# How do the agents run concurrently?

Paste this into the submit form field “How do the agents run concurrently?”

---

Claimswarm is a Mozaik v4 swarm (`defineRuntime` + `join()` + fire-and-forget `runLoop`), not a sequential pipeline.

Three specialist agents — Steelman, Redteam, and Contextualist — each `join()` one runtime and keep their own `ModelContext`. When the operator `sendMessage`s a claim, every specialist’s `message.sent` handler calls `runLoop` and returns immediately. Mozaik does not await `runLoop` or `processor.apply`, so the three loops think, call `cite_evidence`, and answer at the same time. `npm run demo` prints ISO timestamps and exits 0 only if the third `inference.started` occurs before the first of those inferences completes.

They share the environment, not memory. Shared data lives on `ClaimswarmState` (claim, evidence board, sentry flags, roster) plus the event bus. Coordination is reaction:

- Sentry is a joined policy participant. On another agent’s `function_call.started` it flags the call while that caller is still inside its loop.
- Each specialist’s `runLoop` carries an `InterceptionHandler`. If a `model_message` tries to declare the claim “settled” / “proven beyond doubt”, the handler rewrites the transition to `message_received` mid-loop (`interception.started` / `interception.finished`) and that agent infers again. Other specialists are not paused.
- Synthesizer listens to `function_call.started`, `function_call.completed`, and `model.answer` and updates the live board as events arrive. It does not wait for a join barrier.
- The operator can `sendMessage` again mid-run; new loops start while earlier ones are still open.
- Coordinator watches `participant.left`. When Scout leaves, Auditor `join()`s the same runtime and starts investigating.

Nothing is one agent with tools in a for-loop. A join-and-wait fan-out cannot produce the overlap proof the demo requires.
