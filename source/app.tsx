import { Box, Text, useApp, useInput } from "ink";
import { useEffect, useState } from "react";
import type { Runtime } from "@mozaik-ai/core";
import { runScriptedSession, type ScriptedResult } from "./script.js";
import { summarizeOverlap } from "./overlap.js";

type Props = {
  runtime: Runtime;
  live: boolean;
};

export function App({ runtime, live }: Props) {
  const { exit } = useApp();
  const [result, setResult] = useState<ScriptedResult | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    runScriptedSession({ runtime })
      .then((next) => {
        if (!cancelled) setResult(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [runtime]);

  useInput((input, key) => {
    if (input === "q" || key.escape) {
      exit();
    }
  });

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Claimswarm failed: {error}</Text>
        <Text dimColor>Press q to quit.</Text>
      </Box>
    );
  }

  if (!result) {
    return (
      <Box flexDirection="column">
        <Text>Claimswarm ops room — {live ? "live model" : "simulated inference"}</Text>
        <Text dimColor>Specialists are in-loop on the same runtime…</Text>
      </Box>
    );
  }

  const overlap = summarizeOverlap(result.overlap);
  return (
    <Box flexDirection="column">
      <Text bold>Claimswarm</Text>
      <Text>Claim: {result.snapshot.claim}</Text>
      <Text color={overlap.overlapping ? "green" : "red"}>{overlap.detail}</Text>
      <Text>Sentry: {result.snapshot.sentryNote ?? "(silent)"}</Text>
      <Text>Interception: {result.snapshot.interception ?? "none"}</Text>
      {result.snapshot.findings.map((finding) => (
        <Text key={`${finding.agent}-${finding.note}`}>
          {finding.agent}: {finding.note}
        </Text>
      ))}
      <Text dimColor>q to quit</Text>
    </Box>
  );
}
