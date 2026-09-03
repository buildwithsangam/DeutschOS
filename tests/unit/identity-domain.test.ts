import { describe, expect, it } from "vitest";

import {
  CONSENT_FEATURES,
  deriveConsentState,
  isConsentFeature,
  type ConsentRecord,
} from "@/modules/identity/domain/consent";

describe("consent domain", () => {
  it("exposes the canonical feature set", () => {
    expect(CONSENT_FEATURES).toContain("ai_explanation");
    expect(CONSENT_FEATURES).toContain("audio_recording");
    expect(CONSENT_FEATURES.length).toBe(5);
  });

  it("validates consent feature strings", () => {
    expect(isConsentFeature("ai_explanation")).toBe(true);
    expect(isConsentFeature("invalid")).toBe(false);
    expect(isConsentFeature("")).toBe(false);
  });

  it("derives the latest action per feature", () => {
    const records: ConsentRecord[] = [
      {
        id: "1",
        learnerId: "u1",
        feature: "ai_explanation",
        action: "grant",
        consentVersion: null,
        recordedAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "2",
        learnerId: "u1",
        feature: "ai_explanation",
        action: "withdraw",
        consentVersion: null,
        recordedAt: "2026-02-01T00:00:00Z",
      },
    ];

    const state = deriveConsentState(records);
    expect(state.ai_explanation).toBe("withdraw");
  });

  it("keeps the first (most recent) action when sorted descending", () => {
    const records: ConsentRecord[] = [
      {
        id: "2",
        learnerId: "u1",
        feature: "audio_recording",
        action: "withdraw",
        consentVersion: null,
        recordedAt: "2026-02-01T00:00:00Z",
      },
      {
        id: "1",
        learnerId: "u1",
        feature: "audio_recording",
        action: "grant",
        consentVersion: null,
        recordedAt: "2026-01-01T00:00:00Z",
      },
    ];

    const state = deriveConsentState(records);
    expect(state.audio_recording).toBe("withdraw");
  });

  it("returns empty state for no records", () => {
    expect(deriveConsentState([])).toEqual({});
  });
});
