import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { Breadcrumb } from '@/components/app/breadcrumb';
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
      <Breadcrumb
        segments={[
          { label: 'Learn', href: '/learn' },
          { label: 'Guides', href: '/resources' },
          { label: resource.title },
        ]}
      />
      <header className="space-y-3">
        <p className="font-mono text-[0.625rem] tracking-[0.16em] text-muted-foreground uppercase">
          {CATEGORY_TITLE[resource.category]}
        </p>
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
