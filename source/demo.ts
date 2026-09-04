import { runScriptedSession } from "./script.js";

const result = await runScriptedSession();
if (!result.ok) {
  console.error("demo failed overlap or sentry proof");
  process.exit(1);
}
process.exit(0);
