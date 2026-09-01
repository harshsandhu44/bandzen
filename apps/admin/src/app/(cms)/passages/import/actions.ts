'use server';

import { redirect } from 'next/navigation';
import { createPassage, createQuestion } from '@bandzen/db/queries';
import { requireAdminOrTeacher } from '@/lib/auth';
import { importedPassageSchema } from './schema';

export type ImportState = { error: string | null };

export async function importPassageAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const { userId } = await requireAdminOrTeacher();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a JSON file to import.' };
  }

  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    return { error: 'That file is not valid JSON.' };
  }

  const parsed = importedPassageSchema.safeParse(json);
  if (!parsed.success) {
    return {
      error: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; '),
    };
  }
  const data = parsed.data;

  const passage = await createPassage({
    slug: data.slug,
    title: data.title,
    body: data.body,
    topic: data.topic,
    headings: data.headings,
    difficulty: data.difficulty,
    updatedBy: userId,
  });
  if (!passage) return { error: 'Failed to create passage.' };

  // Sequential, not transactional -- see packages/db/src/queries.ts's note on
  // the neon-http driver having no transaction support. A question that fails
  // here leaves an incomplete draft, which publish-validation already catches.
  for (const q of data.questions) {
    await createQuestion(passage.id, {
      idx: q.idx,
      kind: q.kind,
      prompt: q.prompt,
      options: q.options,
      evidence: q.evidence,
      explanation: q.explanation,
      answer: q.answer,
    });
  }

  redirect(`/passages/${passage.id}`);
}
