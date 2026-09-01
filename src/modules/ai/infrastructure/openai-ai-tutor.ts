import "server-only";

import OpenAI from "openai";

import type {
  AiExplanation,
  AiExplanationRequest,
  AiTutor,
} from "@/modules/ai/domain/ai-tutor";

/**
 * OpenAI adapter only. Calling code owns authorization, consent, prompt
 * selection, validation, telemetry, and persistence decisions.
 */
export class OpenAiTutor implements AiTutor {
  constructor(
    private readonly client: OpenAI,
    private readonly model: string,
  ) {}

  async explain(request: AiExplanationRequest): Promise<AiExplanation> {
    const response = await this.client.responses.create({
      model: this.model,
      store: false,
      input: [
        {
          role: "developer",
          content: "Provide a concise formative German-learning explanation. Do not claim official exam authority.",
        },
        {
          role: "user",
          content: `Curriculum node: ${request.curriculumNodeId}\nPrompt version: ${request.promptVersion}\nQuestion: ${request.learnerQuestion}`,
        },
      ],
    });

    return {
      text: response.output_text,
      provider: "openai",
      model: response.model ?? this.model,
      requestId: response._request_id ?? undefined,
    };
  }
}
