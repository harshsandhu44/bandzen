/** IELTS Reading is 60 minutes for 40 questions; scale shorter sets to match. */
export function minutesFor(questionCount: number) {
  return Math.max(5, Math.round((questionCount / 40) * 60));
}
