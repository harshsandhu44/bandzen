'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { capture } from '@/lib/analytics';
import { requireUserId } from '@/lib/auth';
import { checkAwards } from '@/lib/award-check';
import { markLessonComplete } from '@/lib/db/queries';
import { getLesson } from '@/content/lessons';

/** Mark a lesson read. Ignores ids that are not real lessons. */
export async function completeLesson(formData: FormData) {
  const userId = await requireUserId();
  const lessonId = String(formData.get('lessonId') ?? '');

  // The id comes from a form field, so it is checked against the content
  // module rather than trusted into the database.
  const lesson = await getLesson(lessonId);
  if (!lesson?.stages) return;

  await markLessonComplete(userId, lessonId);
  await checkAwards(userId);
  after(() =>
    capture(userId, 'lesson_completed', {
      module: lesson.module,
      lesson_id: lessonId,
    }),
  );
  revalidatePath('/learn');
  revalidatePath(`/learn/${lesson.module}/${lessonId}`);
  // The award strip lives on the dashboard, so it has to be revalidated too.
  revalidatePath('/');
}
