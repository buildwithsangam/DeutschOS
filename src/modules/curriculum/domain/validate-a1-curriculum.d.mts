export type CurriculumValidationIssue = {
  code: string;
  message: string;
  day?: number;
  reference?: number;
  key?: string;
};

export type CurriculumValidationResult = {
  valid: boolean;
  errors: CurriculumValidationIssue[];
  warnings: CurriculumValidationIssue[];
};

export function validateA1Curriculum(curriculum: unknown): CurriculumValidationResult;
export function assertValidA1Curriculum(curriculum: unknown): CurriculumValidationResult;
