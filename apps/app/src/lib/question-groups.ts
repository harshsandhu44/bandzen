import type { Question } from './db/schema';

type Groupable = Pick<Question, 'id' | 'idx' | 'kind'> & { sectionId?: string };

export type QuestionGroup<Q extends Groupable> = {
  /** Passage or track id; `''` for a single-section practice attempt. */
  sectionId: string;
  kind: Question['kind'];
  questions: Q[];
  from: number;
  to: number;
};

/**
 * The paper's "Questions 1–4" blocks: consecutive runs of the same question
 * kind within one passage/track, in the order given. Never sorts or merges —
 * a kind that reappears later is a second block, so numbering stays intact.
 */
export function groupQuestions<Q extends Groupable>(
  questions: readonly Q[],
): QuestionGroup<Q>[] {
  const groups: QuestionGroup<Q>[] = [];
  for (const q of questions) {
    const sectionId = q.sectionId ?? '';
    const last = groups.at(-1);
    if (last && last.sectionId === sectionId && last.kind === q.kind) {
      last.questions.push(q);
      last.to = q.idx;
    } else {
      groups.push({
        sectionId,
        kind: q.kind,
        questions: [q],
        from: q.idx,
        to: q.idx,
      });
    }
  }
  return groups;
}

/** One page per group, or one page per passage/track holding all its groups. */
export function pageGroups<Q extends Groupable>(
  groups: readonly QuestionGroup<Q>[],
  by: 'group' | 'section',
): QuestionGroup<Q>[][] {
  if (by === 'group') return groups.map((g) => [g]);
  const pages: QuestionGroup<Q>[][] = [];
  for (const g of groups) {
    const last = pages.at(-1);
    if (last && last[0].sectionId === g.sectionId) last.push(g);
    else pages.push([g]);
  }
  return pages;
}
