import { NextResponse } from 'next/server';
import {
  createPassage,
  createQuestion,
  createTrack,
  createSpeakingTest,
  createSpeakingPrompt,
  listPassagesAdmin,
  listTracksAdmin,
  listSpeakingTestsAdmin,
  recordContentEvent,
} from '@bandzen/db/queries';
import {
  generatePassage,
  generateListeningTrack,
  generateSpeakingTest,
} from '@bandzen/ai/generate';
import { requireAdminOrTeacher } from '@/lib/auth';

// One gpt-5.5 call for a whole passage/track/test — tens of seconds, well
// under the budget, but past the default 15s.
export const maxDuration = 120;

const KINDS = ['passages', 'listening', 'speaking'] as const;
type Kind = (typeof KINDS)[number];

/** Make the model's slug unique against what already exists. */
function uniqueSlug(slug: string, taken: Set<string>) {
  if (!taken.has(slug)) return slug;
  for (let n = 2; ; n += 1) {
    const candidate = `${slug}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { userId } = await requireAdminOrTeacher();
  const { type } = await params;
  if (!KINDS.includes(type as Kind)) {
    return NextResponse.json({ error: 'Unknown type' }, { status: 404 });
  }
  const kind = type as Kind;

  const body = (await request.json().catch(() => ({}))) as {
    topic?: string;
    difficulty?: number;
  };
  const opts = {
    topic: body.topic?.trim() || undefined,
    difficulty:
      body.difficulty && body.difficulty >= 1 && body.difficulty <= 5
        ? body.difficulty
        : undefined,
  };

  try {
    if (kind === 'passages') {
      const existing = new Set((await listPassagesAdmin()).map((p) => p.slug));
      const { data, warnings } = await generatePassage({
        ...opts,
        avoid: [...existing].slice(0, 40),
      });
      const slug = uniqueSlug(data.slug, existing);
      const passage = await createPassage({
        slug,
        title: data.title,
        body: data.body,
        topic: data.topic,
        headings: data.headings,
        difficulty: data.difficulty,
        updatedBy: userId,
      });
      if (!passage) throw new Error('The passage row was not created.');
      for (const q of data.questions) {
        await createQuestion(
          { passageId: passage.id },
          {
            idx: q.idx,
            kind: q.kind,
            prompt: q.prompt,
            options: q.options,
            evidence: q.evidence,
            explanation: q.explanation,
            answer: q.answer,
          },
        );
      }
      await recordContentEvent('passage', passage.id, userId, 'created');
      return NextResponse.json({
        id: passage.id,
        title: passage.title,
        href: `/passages/${passage.id}`,
        warnings,
      });
    }

    if (kind === 'listening') {
      const existing = new Set((await listTracksAdmin()).map((t) => t.slug));
      const { data, warnings } = await generateListeningTrack({
        ...opts,
        avoid: [...existing].slice(0, 40),
      });
      const slug = uniqueSlug(data.slug, existing);
      const track = await createTrack({
        slug,
        title: data.title,
        topic: data.topic,
        transcript: data.transcript,
        matchingOptions: data.matchingOptions,
        difficulty: data.difficulty,
        updatedBy: userId,
      });
      if (!track) throw new Error('The track row was not created.');
      for (const q of data.questions) {
        await createQuestion(
          { trackId: track.id },
          {
            idx: q.idx,
            kind: q.kind,
            prompt: q.prompt,
            options: q.options,
            evidence: q.evidence,
            explanation: q.explanation,
            answer: q.answer,
          },
        );
      }
      await recordContentEvent('listening-track', track.id, userId, 'created');
      return NextResponse.json({
        id: track.id,
        title: track.title,
        href: `/listening/${track.id}`,
        warnings: [
          ...warnings,
          'Audio has not been generated — open the editor to synthesize it.',
        ],
      });
    }

    const existing = new Set(
      (await listSpeakingTestsAdmin()).map((t) => t.slug),
    );
    const { data, warnings } = await generateSpeakingTest({
      ...opts,
      avoid: [...existing].slice(0, 40),
    });
    const slug = uniqueSlug(data.slug, existing);
    const test = await createSpeakingTest({
      slug,
      title: data.title,
      topic: data.topic,
      difficulty: data.difficulty,
      updatedBy: userId,
    });
    if (!test) throw new Error('The test row was not created.');
    for (const p of data.prompts) {
      await createSpeakingPrompt(test.id, {
        idx: p.idx,
        part: p.part,
        text: p.text,
        cueCardPoints: p.cueCardPoints ?? null,
        prepSeconds: p.prepSeconds,
      });
    }
    await recordContentEvent('speaking-test', test.id, userId, 'created');
    return NextResponse.json({
      id: test.id,
      title: test.title,
      href: `/speaking/${test.id}`,
      warnings: [
        ...warnings,
        'Examiner audio has not been generated — open the editor to synthesize it.',
      ],
    });
  } catch (e) {
    console.error('[cms] generate failed', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Generation failed.' },
      { status: 500 },
    );
  }
}
