import "server-only";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type PreA1BridgeSession = { number: number; title: string; content: string };

export function getPreA1Bridge() {
  const sourceDocument = "docs/curriculum/pre-a1-15-day-bridge-v1.md";
  const source = readFileSync(resolve(process.cwd(), sourceDocument), "utf8");
  const matches = [...source.matchAll(/^### Session (\d+) — (.+)\n\n([\s\S]*?)(?=^### Session \d+ —|^## Transition to A1)/gm)];
  const sessions = matches.map((match) => ({ number: Number(match[1]), title: match[2], content: match[3].trim() }));
  if (sessions.length !== 15) throw new Error("Pre-A1 bridge must contain exactly 15 sessions.");
  return { sourceDocument, sessions };
}
