export type Profile = {
  id: string;
  displayName: string | null;
  timezone: string;
  targetExamTrackId: string | null;
  consentVersion: string | null;
  consentedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateableProfileFields = {
  displayName?: string | null;
  timezone?: string;
  targetExamTrackId?: string | null;
};
