/**
 * IELTS scoring now lives in `@bandzen/exams` as IELTS's adapter; the app keeps
 * importing it from here.
 */
export {
  isAnswerCorrect,
  overallBand,
  readingBand,
  speakingCoverageCeiling,
  writingLengthCeiling,
  writingSectionBand,
} from '@bandzen/exams/scoring';
