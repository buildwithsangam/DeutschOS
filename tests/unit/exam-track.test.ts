import { describe, expect, it } from "vitest";

import {
  DEFAULT_EXAM_TRACK_ID,
  EXAM_TRACK_IDS,
  EXAM_TRACK_METADATA,
  normalizeExamTrackId,
} from "@/modules/exam/domain/exam-track";

describe("exam track normalization", () => {
  it("accepts canonical ids", () => {
    expect(normalizeExamTrackId("goethe")).toBe("goethe");
    expect(normalizeExamTrackId("telc")).toBe("telc");
    expect(normalizeExamTrackId("oesd")).toBe("oesd");
  });

  it("normalizes legacy ÖSD values", () => {
    expect(normalizeExamTrackId("ösd")).toBe("oesd");
    expect(normalizeExamTrackId("ÖSD")).toBe("oesd");
    expect(normalizeExamTrackId("osd")).toBe("oesd");
  });

  it("rejects unknown values", () => {
    expect(normalizeExamTrackId(null)).toBeNull();
    expect(normalizeExamTrackId("unknown")).toBeNull();
    expect(normalizeExamTrackId("")).toBeNull();
  });

  it("uses Goethe as the default track", () => {
    expect(DEFAULT_EXAM_TRACK_ID).toBe("goethe");
  });
});

describe("exam track metadata", () => {
  it("contains exactly the three supported tracks", () => {
    expect(EXAM_TRACK_IDS).toEqual(["goethe", "telc", "oesd"]);
    expect(Object.keys(EXAM_TRACK_METADATA).sort()).toEqual(
      ["goethe", "telc", "oesd"].sort(),
    );
  });

  it("contains verified timing and Day 42 resource references", () => {
    for (const id of EXAM_TRACK_IDS) {
      const metadata = EXAM_TRACK_METADATA[id];

      expect(metadata.displayName).toBeTruthy();
      expect(metadata.verifiedFormatTiming).toBeTruthy();
      expect(metadata.officialDay42ResourceLabel).toBeTruthy();
      expect(metadata.officialDay42ResourceReference).toMatch(/^https:\/\//);
    }
  });
});
