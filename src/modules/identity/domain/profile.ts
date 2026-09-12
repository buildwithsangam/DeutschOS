import type { ExamTrackId } from "@/modules/exam/domain/exam-track";

export type Profile = {
  id: string;
  displayName: string | null;
  timezone: string;
  targetExamTrackId: ExamTrackId | null;
  consentVersion: string | null;
  consentedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateableProfileFields = {
  displayName?: string | null;
  timezone?: string;
  targetExamTrackId?: ExamTrackId | null;
};
