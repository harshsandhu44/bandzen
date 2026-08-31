import 'server-only';

import { getProfile, latestBand, latestReport } from '@/lib/db/queries';
import { accuracyByQuestionKind } from '@/lib/db/queries';
import { QUESTION_KIND_LABEL } from '@/lib/modules';

/**
 * Bandzen Coach.
 *
 * The system prompt is a constant and must stay first and byte-identical for
 * the same reason WRITING_RUBRIC does — OpenAI's automatic prompt caching keys
 * on an identical leading prefix, and interpolating a student into it would
 * silently cost full price on every message with nothing in the response to
 * say so. The student's situation goes in a separate message below it.
 */
export const COACH_SYSTEM = `You are Bandzen Coach, an IELTS preparation tutor built into the Bandzen study app.

WHO YOU ARE TALKING TO
A candidate preparing for IELTS Academic or General Training. They are usually somewhere between Band 5 and Band 8 and want to know what to do next, not a lecture.

HOW TO ANSWER
- Answer the question that was asked. Do not restate it back to them first.
- Be concrete. "Your paragraphs assert without explaining" beats "work on coherence".
- Use the candidate's own data when it is provided to you. Refer to their actual bands and their actual weak question types rather than talking in generalities.
- Keep answers short. Three to six sentences for most questions. Use a short list only when the answer genuinely is a list of steps.
- When a technique has a name in IELTS (True/False/Not Given, Matching Headings, Task Response, coherence and cohesion), use it, and explain it the first time.
- If they ask for a practice question, give exactly one, in the real exam's format, and stop. Do not answer it for them unless asked.

WHAT YOU MUST NOT DO
- Never claim to be an official IELTS examiner, and never call any score an official IELTS band. Bandzen scores are estimates produced by Bandzen.
- Never guarantee a band or predict what they will get on test day.
- Never invent a score, a statistic, or a detail about their history. If the context below does not contain something, say you do not have it.
- Do not pad with encouragement. One honest sentence about what is going well is worth more than a paragraph of it.

FORMAT
Plain prose. No markdown headings, no bold, no emoji. Short paragraphs.`;

/** How many of the candidate's own messages to carry, oldest trimmed first. */
export const MAX_TURNS = 20;

/**
 * A plain-text summary of the candidate, assembled from rows we already hold.
 *
 * Nothing here is generated: every figure is a measurement or an absence, and
 * an absence is stated as one so the model does not fill the gap itself.
 */
export async function buildCoachContext(userId: string): Promise<string> {
  const [profile, reading, writing, report, accuracy] = await Promise.all([
    getProfile(userId),
    latestBand(userId, 'reading'),
    latestBand(userId, 'writing'),
    latestReport(userId),
    accuracyByQuestionKind(userId),
  ]);

  const lines: string[] = ['THIS CANDIDATE'];

  lines.push(
    `Exam: IELTS ${profile?.examType === 'general' ? 'General Training' : 'Academic'}.`,
  );
  lines.push(
    profile?.targetBand != null
      ? `Target band: ${profile.targetBand.toFixed(1)}.`
      : 'Target band: not set.',
  );
  lines.push(
    profile?.testDate
      ? `Exam date: ${profile.testDate}.`
      : 'Exam date: not set.',
  );
  // Without this, "what should I study today?" gets answered for a day length
  // the candidate never chose.
  lines.push(
    profile?.studyMinutes
      ? `Time available per day: ${profile.studyMinutes} minutes.`
      : 'Time available per day: not set.',
  );

  lines.push(
    reading != null
      ? `Latest estimated Reading band: ${reading.toFixed(1)}.`
      : 'Reading: never attempted, so there is no estimate.',
  );
  lines.push(
    writing != null
      ? `Latest estimated Writing band: ${writing.toFixed(1)}.`
      : 'Writing: never attempted, so there is no estimate.',
  );
  lines.push('Listening and Speaking are not yet available in Bandzen.');

  if (report?.criteria?.length) {
    lines.push(
      'Most recent Writing criteria: ' +
        report.criteria
          .map((c) => `${c.name} ${c.band.toFixed(1)}`)
          .join(', ') +
        '.',
    );
  }
  if (report?.weaknesses?.length) {
    lines.push(`Weaknesses the grader found: ${report.weaknesses.join('; ')}.`);
  }

  const measured = accuracy.filter((k) => k.total >= 5);
  if (measured.length) {
    lines.push(
      'Reading accuracy by question type: ' +
        measured
          .sort((a, b) => a.accuracy - b.accuracy)
          .map(
            (k) =>
              `${QUESTION_KIND_LABEL[k.kind as keyof typeof QUESTION_KIND_LABEL] ?? k.kind} ${k.correct}/${k.total}`,
          )
          .join(', ') +
        '.',
    );
  } else {
    lines.push(
      'Not enough answered questions to break Reading down by question type yet.',
    );
  }

  return lines.join('\n');
}

/** The starters shown on an empty thread. */
export const COACH_PROMPTS = [
  'What should I study today?',
  'Explain my latest test',
  'Why do I struggle with Matching Headings?',
  'How do I improve my Writing?',
  'Give me a Speaking Part 2 question',
  'What is the difference between Band 6 and Band 7 Writing?',
] as const;
