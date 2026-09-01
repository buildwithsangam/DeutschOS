export type AiExplanationRequest = {
  curriculumNodeId: string;
  promptVersion: string;
  learnerQuestion: string;
};

export type AiExplanation = {
  text: string;
  provider: "openai";
  model: string;
  requestId?: string;
};

/**
 * The domain-facing AI port. Future operations must return validated,
 * typed results and must not mutate learner or curriculum state directly.
 */
export interface AiTutor {
  explain(request: AiExplanationRequest): Promise<AiExplanation>;
}
