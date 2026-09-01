import "server-only";

import OpenAI from "openai";

import { OpenAiTutor } from "@/modules/ai/infrastructure/openai-ai-tutor";

function requiredEnvironmentVariable(name: "OPENAI_API_KEY" | "OPENAI_MODEL"): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} must be configured before using the OpenAI adapter.`);
  }

  return value;
}

/** Creates a server-only adapter; it is not called by the application foundation. */
export function createOpenAiTutor(): OpenAiTutor {
  return new OpenAiTutor(
    new OpenAI({ apiKey: requiredEnvironmentVariable("OPENAI_API_KEY") }),
    requiredEnvironmentVariable("OPENAI_MODEL"),
  );
}
