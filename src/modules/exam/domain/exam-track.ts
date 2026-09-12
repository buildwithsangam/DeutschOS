export type ExamTrackId = "goethe" | "telc" | "oesd";

export type ExamTrackMetadata = {
  id: ExamTrackId;
  displayName: string;
  verifiedFormatTiming: string;
  officialDay42ResourceLabel: string;
  officialDay42ResourceReference: string;
};

export const DEFAULT_EXAM_TRACK_ID: ExamTrackId = "goethe";

export function normalizeExamTrackId(raw: string | null): ExamTrackId | null {
  if (raw == null) return null;
  const normalized = raw.trim().toLocaleLowerCase("de-DE");

  if (normalized === "goethe") return "goethe";
  if (normalized === "telc") return "telc";
  if (normalized === "oesd" || normalized === "ösd" || normalized === "osd") {
    return "oesd";
  }

  return null;
}

export const EXAM_TRACK_METADATA: Record<ExamTrackId, ExamTrackMetadata> = {
  goethe: {
    id: "goethe",
    displayName: "Goethe-Zertifikat A1 (Start Deutsch 1)",
    verifiedFormatTiming:
      "Section time limits: ~20 min Hören / 25 min Lesen / 20 min Schreiben / ~15 min Sprechen (group of 4); single non-modular pass/fail at 60% aggregate.",
    officialDay42ResourceLabel:
      "Goethe A1 Modellsatz / appropriate official Goethe practice set (Modellsatz or Übungssatz 01/02)",
    officialDay42ResourceReference:
      "https://www.goethe.de/pro/relaunch/prf/materialien/A1_sd1/",
  },
  telc: {
    id: "telc",
    displayName: "telc Deutsch A1",
    verifiedFormatTiming:
      "Continuous 65-minute written exam (Hören+Lesen+Schreiben together, no break) plus a 15-minute paired oral exam.",
    officialDay42ResourceLabel:
      "Official telc Deutsch A1 Übungstest 1 (full booklet, incl. answer key)",
    officialDay42ResourceReference:
      "https://shop.telc.net/media/catalog/product/file/2/0/20210103_5070-b00-010106_web_1.pdf",
  },
  oesd: {
    id: "oesd",
    displayName: "ÖSD Zertifikat A1",
    verifiedFormatTiming:
      "Separately timed skills: Lesen 25 min / Hören 10 min / Schreiben 20 min / Sprechen 10 min; optional digital delivery.",
    officialDay42ResourceLabel: "Official ÖSD Zertifikat A1 Modellsatz (ZIP)",
    officialDay42ResourceReference: "https://osd.at/downloads/",
  },
};

export const EXAM_TRACK_IDS: ExamTrackId[] = ["goethe", "telc", "oesd"];
