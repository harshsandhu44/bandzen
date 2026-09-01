import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, MessageSquare } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { CATEGORY_TITLE, getResource } from '@/content/resources';
import { requireUserId } from '@/lib/auth';
import { QUESTION_KIND_LABEL } from '@/lib/modules';

export async function generateMetadata({
  params,
}: PageProps<'/resources/[resourceId]'>) {
  const { resourceId } = await params;
  return { title: (await getResource(resourceId))?.title ?? 'Resource' };
}

export default async function ResourcePage({
  params,
}: PageProps<'/resources/[resourceId]'>) {
  const { resourceId } = await params;
  await requireUserId();

  const resource = await getResource(resourceId);
  // An unwritten resource has no page. The index already says so.
  if (!resource?.body) notFound();

  const practiceHref = resource.questionKind
    ? `/reading?kind=${resource.questionKind}`
    : resource.module === 'writing'
      ? '/writing'
      : resource.module === 'reading'
        ? '/reading'
        : null;

  const practiceLabel = resource.questionKind
    ? `Practise ${QUESTION_KIND_LABEL[resource.questionKind]}`
    : resource.module
      ? `Practise ${resource.module}`
      : null;

  return (
    <article className="max-w-3xl space-y-8">
      <header className="space-y-3">
        <Link
          href={`/resources?category=${resource.category}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-3" aria-hidden />
          {CATEGORY_TITLE[resource.category]}
        </Link>
        <h1 className="font-title text-title-lg">{resource.title}</h1>
        <p className="text-xs text-muted-foreground tabular-nums">
          {resource.minutes} min · {resource.level}
        </p>
      </header>

      <div className="max-w-prose space-y-4">
        {resource.body.map((paragraph, i) => (
          <p key={i} className="text-sm/relaxed text-pretty">
            {paragraph}
          </p>
        ))}
      </div>

      <footer className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        {practiceHref && practiceLabel ? (
          <Button nativeButton={false} render={<Link href={practiceHref} />}>
            {practiceLabel}
            <ArrowRight />
          </Button>
        ) : null}
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/coach" />}
        >
          <MessageSquare />
          Ask Bandzen Coach
        </Button>
      </footer>
    </article>
  );
}
