import { notFound } from 'next/navigation';
import { getLessonById } from '@bandzen/db/queries';
import {
  questionKind,
  LESSON_STAGES,
  STAGE_TITLE,
  type LessonStage,
} from '@bandzen/db/schema';
import { Button } from '@bandzen/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@bandzen/ui/components/card';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { StatusBadge } from '@/components/status-badge';
import { PublishControls } from '@/components/publish-controls';
import { StageCard } from './stage-card';
import {
  updateLessonAction,
  publishLessonAction,
  unpublishLessonAction,
  deleteLessonAction,
} from '../actions';

const selectClass =
  'h-8 min-w-32 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50';

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrTeacher();
  const { id } = await params;
  const lesson = await getLessonById(id);
  if (!lesson) notFound();

  const stagesById = new Map<string, LessonStage>(
    (lesson.stages ?? []).map((s) => [s.id, s]),
  );

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Lessons"
        title={lesson.title}
        description={
          <span className="font-mono text-xs tabular-nums">
            {lesson.slug} · {lesson.module} · updated by{' '}
            {lesson.updatedBy ?? '—'} at {lesson.updatedAt.toLocaleString()}
          </span>
        }
        action={<StatusBadge status={lesson.status} />}
      />

      <PublishControls
        id={lesson.id}
        status={lesson.status}
        publishAction={publishLessonAction}
        unpublishAction={unpublishLessonAction}
        deleteAction={deleteLessonAction}
      />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateLessonAction} className="space-y-4">
            <input type="hidden" name="id" value={lesson.id} />
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={lesson.title}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Input
                id="summary"
                name="summary"
                defaultValue={lesson.summary}
                required
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label htmlFor="minutes">Minutes</Label>
                <Input
                  id="minutes"
                  name="minutes"
                  type="number"
                  min={1}
                  defaultValue={lesson.minutes}
                  className="w-20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="questionKind">Question kind (optional)</Label>
                <select
                  id="questionKind"
                  name="questionKind"
                  defaultValue={lesson.questionKind ?? ''}
                  className={selectClass}
                >
                  <option value="">None</option>
                  {questionKind.enumValues.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-sm font-medium">Stages</h2>
        {LESSON_STAGES.map((stageId) => (
          <StageCard
            key={stageId}
            lessonId={lesson.id}
            stageId={stageId}
            stageTitle={STAGE_TITLE[stageId]}
            stage={stagesById.get(stageId)}
          />
        ))}
      </div>
    </div>
  );
}
