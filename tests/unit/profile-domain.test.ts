import { describe, expect, it } from "vitest";

import type { Profile, UpdateableProfileFields } from "@/modules/identity/domain/profile";

describe("profile domain types", () => {
  it("defines a profile with identity and consent fields", () => {
    const profile: Profile = {
      id: "user-1",
      displayName: "Test Learner",
      timezone: "Europe/Berlin",
      targetExamTrackId: null,
      consentVersion: null,
      consentedAt: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    expect(profile.id).toBe("user-1");
    expect(profile.timezone).toBe("Europe/Berlin");
    expect(profile.targetExamTrackId).toBeNull();
  });

  it("allows partial updates via UpdateableProfileFields", () => {
    const update: UpdateableProfileFields = {
      displayName: "New Name",
    };

    expect(update.displayName).toBe("New Name");
    expect(update.timezone).toBeUndefined();
  });
});
