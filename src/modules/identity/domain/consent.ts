export const CONSENT_FEATURES = [
  "ai_explanation",
  "ai_feedback",
  "audio_recording",
  "audio_transcription",
  "journal_feedback",
] as const;

export type ConsentFeature = (typeof CONSENT_FEATURES)[number];

export type ConsentAction = "grant" | "withdraw";

export type ConsentRecord = {
  id: string;
  learnerId: string;
  feature: ConsentFeature;
  action: ConsentAction;
  consentVersion: string | null;
  recordedAt: string;
};

export type ConsentRequest = {
  feature: ConsentFeature;
  action: ConsentAction;
  consentVersion?: string;
};

export function isConsentFeature(value: string): value is ConsentFeature {
  return (CONSENT_FEATURES as readonly string[]).includes(value);
}

export type ConsentState = Partial<Record<ConsentFeature, ConsentAction>>;

export function deriveConsentState(
  records: ConsentRecord[],
): ConsentState {
  const sorted = [...records].sort(
    (a, b) =>
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );
  const state: ConsentState = {};
  for (const record of sorted) {
    if (!(record.feature in state)) {
      state[record.feature] = record.action;
    }
  }
  return state;
}
