export class ContentInUseError extends Error {}

export class PublishValidationError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super(`Cannot publish: missing ${issues.join(', ')}`);
    this.issues = issues;
  }
}
