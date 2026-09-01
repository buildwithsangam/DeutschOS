export type PrivateUploadRequest = {
  ownerId: string;
  contentType: string;
  filename: string;
};

export type PrivateUploadGrant = {
  path: string;
  token: string;
};

/**
 * Boundary for future private learner-media uploads. Consent, retention, and
 * authorization are application responsibilities, not Storage SDK behavior.
 */
export interface ObjectStore {
  createPrivateUploadGrant(request: PrivateUploadRequest): Promise<PrivateUploadGrant>;
  deletePrivateObject(path: string): Promise<void>;
}
