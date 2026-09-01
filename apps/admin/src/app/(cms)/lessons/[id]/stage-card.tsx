import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@bandzen/ui/components/card';
import { Button } from '@bandzen/ui/components/button';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import { Textarea } from '@bandzen/ui/components/textarea';
import type {
  LessonBlock,
  LessonStage,
  LessonStageId,
} from '@bandzen/db/schema';
import {
  addStageAction,
  deleteStageAction,
  addBlockAction,
  deleteBlockAction,
  moveBlockAction,
} from '../actions';

const selectClass =
  'h-8 min-w-32 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50';

function blockPreview(block: LessonBlock): string {
  switch (block.kind) {
    case 'prose':
      return block.body.slice(0, 80);
    case 'steps':
    case 'checklist':
      return `${block.items.length} item(s)`;
    case 'callout':
      return `${block.tone}: ${block.title}`;
    case 'example':
    case 'try':
      return block.question.slice(0, 80);
  }
}

export function StageCard({
  lessonId,
  stageId,
  stageTitle,
  stage,
}: {
  lessonId: string;
  stageId: LessonStageId;
  stageTitle: string;
  stage: LessonStage | undefined;
}) {
  if (!stage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            {stageTitle} — not added
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addStageAction}>
            <input type="hidden" name="lessonId" value={lessonId} />
            <input type="hidden" name="stageId" value={stageId} />
            <Button type="submit" variant="outline">
              Add this stage
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">{stageTitle}</CardTitle>
        <form action={deleteStageAction}>
          <input type="hidden" name="lessonId" value={lessonId} />
          <input type="hidden" name="stageId" value={stageId} />
          <Button type="submit" variant="destructive" size="sm">
            Delete stage
          </Button>
        </form>
      </CardHeader>
      <CardContent className="space-y-4">
        {stage.blocks.length === 0 ? (
          <p className="text-xs text-muted-foreground">No blocks yet.</p>
        ) : (
          <ul className="space-y-2">
            {stage.blocks.map((block, index) => (
              <li
                key={index}
                className="flex items-center justify-between gap-2 border border-border p-2 text-xs"
              >
                <span>
                  <strong>{block.kind}</strong> — {blockPreview(block)}
                </span>
                <span className="flex gap-1">
                  <form action={moveBlockAction}>
                    <input type="hidden" name="lessonId" value={lessonId} />
                    <input type="hidden" name="stageId" value={stageId} />
                    <input type="hidden" name="index" value={index} />
                    <input type="hidden" name="direction" value="up" />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                  </form>
                  <form action={moveBlockAction}>
                    <input type="hidden" name="lessonId" value={lessonId} />
                    <input type="hidden" name="stageId" value={stageId} />
                    <input type="hidden" name="index" value={index} />
                    <input type="hidden" name="direction" value="down" />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={index === stage.blocks.length - 1}
                    >
                      ↓
                    </Button>
                  </form>
                  <form action={deleteBlockAction}>
                    <input type="hidden" name="lessonId" value={lessonId} />
                    <input type="hidden" name="stageId" value={stageId} />
                    <input type="hidden" name="index" value={index} />
                    <Button type="submit" variant="destructive" size="sm">
                      Delete
                    </Button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}

        <details className="border-t border-border pt-3">
          <summary className="cursor-pointer text-xs font-medium">
            Add block
          </summary>
          <form action={addBlockAction} className="mt-3 space-y-3">
            <input type="hidden" name="lessonId" value={lessonId} />
            <input type="hidden" name="stageId" value={stageId} />

            <div className="space-y-2">
              <Label htmlFor={`${stageId}-kind`}>Kind</Label>
              <select
                id={`${stageId}-kind`}
                name="kind"
                defaultValue="prose"
                className={selectClass}
              >
                <option value="prose">prose</option>
                <option value="steps">steps</option>
                <option value="checklist">checklist</option>
                <option value="callout">callout</option>
                <option value="example">example</option>
                <option value="try">try</option>
              </select>
            </div>

            <p className="text-xs text-muted-foreground">
              Only the fields relevant to the selected kind are used — fill in
              what applies, leave the rest blank.
            </p>

            <div className="space-y-2">
              <Label htmlFor={`${stageId}-body`}>Body (prose / callout)</Label>
              <Textarea id={`${stageId}-body`} name="body" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${stageId}-items`}>
                Items, one per line (steps / checklist)
              </Label>
              <Textarea id={`${stageId}-items`} name="items" />
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${stageId}-calloutTone`}>Callout tone</Label>
                <select
                  id={`${stageId}-calloutTone`}
                  name="calloutTone"
                  defaultValue="note"
                  className={selectClass}
                >
                  <option value="note">note</option>
                  <option value="warning">warning</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${stageId}-title`}>Title (callout)</Label>
                <Input id={`${stageId}-title`} name="title" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${stageId}-source`}>
                Source (example / try)
              </Label>
              <Input id={`${stageId}-source`} name="source" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${stageId}-question`}>
                Question (example / try)
              </Label>
              <Input id={`${stageId}-question`} name="question" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${stageId}-answer`}>
                Answer (example / try)
              </Label>
              <Input id={`${stageId}-answer`} name="answer" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${stageId}-why`}>Why (example / try)</Label>
              <Input id={`${stageId}-why`} name="why" />
            </div>

            <Button type="submit" variant="outline">
              Add block
            </Button>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}
