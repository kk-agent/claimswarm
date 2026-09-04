import { defineTool } from "@mozaik-ai/core";
import { z } from "zod";
import { searchCorpus } from "./corpus.js";
import type { ClaimswarmState, Stance } from "./state.js";

function stanceFromName(name: string): Stance | undefined {
  switch (name) {
    case "Steelman":
      return "steelman";
    case "Redteam":
      return "redteam";
    case "Contextualist":
      return "context";
    default:
      return undefined;
  }
}

export function createStanceTool(state: ClaimswarmState) {
  return defineTool({
    name: "record_stance",
    description:
      "Record this agent's stance and a short evidence note from the local public-finding corpus.",
    parameters: z.object({
      stance: z.enum(["steelman", "redteam", "context"]),
      note: z.string().min(8),
    }),
    execute: async (args, ctx) => {
      const stance = stanceFromName(ctx.agent.name) ?? args.stance;
      const hits = searchCorpus(state.claim, 2);
      const evidence = hits.map((hit) => `${hit.title}: ${hit.excerpt}`);
      state.recordFinding({
        agent: ctx.agent.name,
        stance,
        note: args.note,
        evidence,
      });
      return {
        recorded: true,
        agent: ctx.agent.name,
        stance,
        evidence,
      };
    },
  });
}

export function createAuditTool(state: ClaimswarmState) {
  return defineTool({
    name: "file_audit",
    description: "File a short process audit of concurrent coverage after Scout leaves.",
    parameters: z.object({
      verdict: z.string().min(8),
    }),
    execute: async (args, ctx) => {
      state.appendAudit(`${ctx.agent.name}: ${args.verdict}`);
      return { audited: true };
    },
  });
}
