import { notFound } from 'next/navigation';
import {
  getPassageAdmin,
  getTrackAdmin,
  getSpeakingTestAdmin,
  getWritingPromptById,
  getResourceById,
  getLessonById,
  type ContentType,
} from '@bandzen/db/queries';
import { STAGE_TITLE } from '@bandzen/db/schema';
import { PageHeader, SectionHeader } from '@bandzen/ui/components/primitives';
import { LessonBlockView } from '@/components/learning/lesson-blocks';
import { requireContentRole } from '@/lib/auth';

export const metadata = { title: 'Draft preview', robots: { index: false } };

const TYPES: ContentType[] = [
  'passage',
  'listening-track',
  'speaking-test',
  'writing-prompt',
  'lesson',
  'resource',
];

function Banner({ status }: { status: string }) {
  return (
    <div className="mb-8 border-l-2 border-primary bg-primary/5 px-4 py-2 text-xs">
      <span className="font-mono tracking-widest uppercase">Draft preview</span>{' '}
      — this is how a student sees it. Current status:{' '}
      <span className="font-medium">{status}</span>.
    </div>
  );
}

function Questions({
  items,
}: {
  items: {
    idx: number;
    kind: string;
    prompt: string;
    options: string[] | null;
    answer: string[] | null;
    explanation: string | null;
  }[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-4">
      <SectionHeader as="h2">Questions</SectionHeader>
      <ol className="space-y-4">
        {items.map((q) => (
          <li key={q.idx} className="space-y-1 border-b border-border pb-3">
            <p className="text-sm">
              <span className="font-mono text-xs text-muted-foreground">
                {q.idx}.
              </span>{' '}
              {q.prompt}
            </p>
            {q.options?.length ? (
              <ul className="ml-5 list-disc text-sm text-muted-foreground">
                {q.options.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            ) : null}
            <p className="text-xs">
              <span className="text-muted-foreground">Answer: </span>
              {(q.answer ?? []).join(', ') || '—'}
            </p>
            {q.explanation ? (
              <p className="text-xs text-muted-foreground">{q.explanation}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  await requireContentRole();
  const { type, id } = await params;
  if (!TYPES.includes(type as ContentType)) notFound();

  const shell = (title: string, status: string, body: React.ReactNode) => (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Banner status={status} />
      <PageHeader title={title} />
      <div className="mt-8 space-y-10">{body}</div>
    </main>
  );

  if (type === 'lesson') {
    const lesson = await getLessonById(id);
    if (!lesson) notFound();
    return shell(
      lesson.title,
      lesson.status,
      <>
        <p className="max-w-prose text-sm text-muted-foreground">
          {lesson.summary}
        </p>
        {(lesson.stages ?? []).map((stage) => (
          <section key={stage.id} className="space-y-4">
            <SectionHeader as="h2">{STAGE_TITLE[stage.id]}</SectionHeader>
            <div className="space-y-4">
              {stage.blocks.map((block, j) => (
                <LessonBlockView key={j} block={block} />
              ))}
            </div>
          </section>
        ))}
      </>,
    );
  }

  if (type === 'passage') {
    const p = await getPassageAdmin(id);
    if (!p) notFound();
    return shell(
      p.title,
      p.status,
      <>
        <article className="space-y-3 text-sm/relaxed whitespace-pre-wrap">
          {p.body}
        </article>
        <Questions items={p.questions} />
      </>,
    );
  }

  if (type === 'listening-track') {
    const t = await getTrackAdmin(id);
    if (!t) notFound();
    return shell(
      t.title,
      t.status,
      <>
        {t.audioUrl ? (
          <audio controls src={t.audioUrl} className="w-full" />
        ) : (
          <p className="text-xs text-muted-foreground">No audio yet.</p>
        )}
        {t.transcript ? (
          <details className="text-sm/relaxed">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Transcript
            </summary>
            <p className="mt-2 whitespace-pre-wrap">{t.transcript}</p>
          </details>
        ) : null}
        <Questions items={t.questions} />
      </>,
    );
  }

  if (type === 'speaking-test') {
    const t = await getSpeakingTestAdmin(id);
    if (!t) notFound();
    return shell(
      t.title,
      t.status,
      <>
        {[1, 2, 3].map((part) => {
          const prompts = t.prompts.filter((p) => p.part === part);
          if (prompts.length === 0) return null;
          return (
            <section key={part} className="space-y-3">
              <SectionHeader as="h2">Part {part}</SectionHeader>
              {prompts.map((p) => (
                <div key={p.id} className="space-y-1 border-b border-border pb-3">
                  <p className="text-sm">{p.text}</p>
                  {p.cueCardPoints?.length ? (
                    <ul className="ml-5 list-disc text-sm text-muted-foreground">
                      {p.cueCardPoints.map((pt) => (
                        <li key={pt}>{pt}</li>
                      ))}
                    </ul>
                  ) : null}
                  {p.audioUrl ? (
                    <audio controls src={p.audioUrl} className="h-8" />
                  ) : null}
                </div>
              ))}
            </section>
          );
        })}
      </>,
    );
  }

  if (type === 'writing-prompt') {
    const w = await getWritingPromptById(id);
    if (!w) notFound();
    return shell(
      w.slug,
      w.status,
      <p className="max-w-prose text-sm/relaxed whitespace-pre-wrap">
        {w.promptText}
      </p>,
    );
  }

  const r = await getResourceById(id);
  if (!r) notFound();
  return shell(
    r.title,
    r.status,
    <>
      <p className="max-w-prose text-sm text-muted-foreground">{r.summary}</p>
      {(r.body ?? []).map((para, i) => (
        <p key={i} className="max-w-prose text-sm/relaxed">
          {para}
        </p>
      ))}
    </>,
  );
}
