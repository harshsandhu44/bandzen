import {
  createPassage,
  createQuestion,
  createSpeakingPrompt,
  createSpeakingTest,
  updateSpeakingPrompt,
  createTrack,
  createWritingPrompt,
  createLesson,
  createResource,
  listPassagesAdmin,
  listSpeakingTestsAdmin,
  listTracksAdmin,
  listWritingPromptsAdmin,
  listLessonsAdmin,
  listResourcesAdmin,
} from '@bandzen/db/queries';
import type { z } from 'zod';
import {
  parseItems,
  passageSchema,
  listeningTrackSchema,
  speakingTestSchema,
  writingPromptSchema,
  lessonSchema,
  resourceSchema,
} from './schemas';
import { TEMPLATES, type TemplateOption } from './templates';

/**
 * Everything that differs between the four importers, in one table: what a
 * file may contain, which slugs are already taken, how one item becomes rows,
 * and the template a human copies.
 *
 * The keys are the route segments, so `/lessons/import` and
 * `revalidatePath('/lessons')` both fall out of the key without a second map.
 */

export type ImportEntity = keyof typeof REGISTRY;

/** What the result panel needs to link to a newly created draft. */
export type Created = { id: string; slug: string; label: string };

type Prepared =
  | { error: string }
  | {
      slugs: string[];
      /** Writes item `index`. Indexed so the caller can name the one that failed. */
      insertAt: (index: number, userId: string) => Promise<Created>;
    };

export type ImportEntry = {
  /** Singular, lower case: "Imported 3 lesson drafts." */
  noun: string;
  /** General first, then the variants. See ./templates.ts. */
  templates: TemplateOption[];
  listSlugs: () => Promise<string[]>;
  prepare: (json: unknown) => Prepared;
};

/**
 * Binds one entity's schema to its insert. The generic is what keeps `insert`
 * typed against its own schema; `ImportEntry` erases it so the four entries
 * share one shape.
 */
function entry<T extends { slug: string }>(config: {
  noun: string;
  templates: TemplateOption[];
  schema: z.ZodType<T>;
  listSlugs: () => Promise<string[]>;
  insert: (item: T, userId: string) => Promise<Created>;
}): ImportEntry {
  return {
    noun: config.noun,
    templates: config.templates,
    listSlugs: config.listSlugs,
    prepare(json) {
      const parsed = parseItems(config.schema, json);
      if ('error' in parsed) return parsed;
      return {
        slugs: parsed.items.map((i) => i.slug),
        insertAt: (index, userId) => config.insert(parsed.items[index], userId),
      };
    },
  };
}

export const REGISTRY = {
  passages: entry({
    noun: 'passage',
    templates: TEMPLATES.passages,
    schema: passageSchema,
    listSlugs: async () => (await listPassagesAdmin()).map((p) => p.slug),
    insert: async (item, userId) => {
      const passage = await createPassage({
        slug: item.slug,
        title: item.title,
        body: item.body,
        topic: item.topic,
        headings: item.headings,
        format: item.format,
        difficulty: item.difficulty,
        updatedBy: userId,
      });
      if (!passage) throw new Error('the passage row was not created');

      // Sequential, not transactional -- see packages/db/src/queries.ts's note
      // on the neon-http driver having no transaction support. A question that
      // fails here leaves an incomplete draft, which publish-validation
      // already catches.
      for (const q of item.questions) {
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
      return { id: passage.id, slug: passage.slug, label: passage.title };
    },
  }),

  listening: entry({
    noun: 'listening track',
    templates: TEMPLATES.listening,
    schema: listeningTrackSchema,
    listSlugs: async () => (await listTracksAdmin()).map((t) => t.slug),
    insert: async (item, userId) => {
      const track = await createTrack({
        slug: item.slug,
        title: item.title,
        topic: item.topic,
        transcript: item.transcript,
        audioUrl: item.audioUrl,
        matchingOptions: item.matchingOptions,
        difficulty: item.difficulty,
        updatedBy: userId,
      });
      if (!track) throw new Error('the listening track row was not created');

      // Sequential, not transactional -- same neon-http limitation as passages.
      for (const q of item.questions) {
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
      return { id: track.id, slug: track.slug, label: track.title };
    },
  }),

  speaking: entry({
    noun: 'speaking test',
    templates: TEMPLATES.speaking,
    schema: speakingTestSchema,
    listSlugs: async () => (await listSpeakingTestsAdmin()).map((t) => t.slug),
    insert: async (item, userId) => {
      const test = await createSpeakingTest({
        slug: item.slug,
        title: item.title,
        topic: item.topic,
        difficulty: item.difficulty,
        updatedBy: userId,
      });
      if (!test) throw new Error('the speaking test row was not created');

      // Sequential, not transactional -- same neon-http limitation as passages.
      for (const p of item.prompts) {
        const prompt = await createSpeakingPrompt(test.id, {
          idx: p.idx,
          part: p.part,
          text: p.text,
          cueCardPoints: p.cueCardPoints ?? null,
          prepSeconds: p.prepSeconds,
        });
        // A file straight from the synthesize step already carries the
        // examiner audio; keep it rather than making the CMS re-spend on TTS.
        if (prompt && p.audioUrl) {
          await updateSpeakingPrompt(prompt.id, { audioUrl: p.audioUrl });
        }
      }
      return { id: test.id, slug: test.slug, label: test.title };
    },
  }),

  'writing-prompts': entry({
    noun: 'writing prompt',
    templates: TEMPLATES['writing-prompts'],
    schema: writingPromptSchema,
    listSlugs: async () => (await listWritingPromptsAdmin()).map((p) => p.slug),
    insert: async (item, userId) => {
      const prompt = await createWritingPrompt({
        slug: item.slug,
        task: item.task,
        format: item.format,
        promptText: item.promptText,
        chartData: item.chartData,
        updatedBy: userId,
      });
      if (!prompt) throw new Error('the writing prompt row was not created');
      return { id: prompt.id, slug: prompt.slug, label: prompt.slug };
    },
  }),

  lessons: entry({
    noun: 'lesson',
    templates: TEMPLATES.lessons,
    schema: lessonSchema,
    listSlugs: async () => (await listLessonsAdmin()).map((l) => l.slug),
    insert: async (item, userId) => {
      const lesson = await createLesson({
        slug: item.slug,
        module: item.module,
        group: item.group,
        title: item.title,
        summary: item.summary,
        minutes: item.minutes,
        questionKind: item.questionKind,
        orderIndex: item.orderIndex,
        stages: item.stages ?? null,
        updatedBy: userId,
      });
      if (!lesson) throw new Error('the lesson row was not created');
      return { id: lesson.id, slug: lesson.slug, label: lesson.title };
    },
  }),

  resources: entry({
    noun: 'resource',
    templates: TEMPLATES.resources,
    schema: resourceSchema,
    listSlugs: async () => (await listResourcesAdmin()).map((r) => r.slug),
    insert: async (item, userId) => {
      const resource = await createResource({
        slug: item.slug,
        title: item.title,
        summary: item.summary,
        category: item.category,
        level: item.level,
        minutes: item.minutes,
        module: item.module,
        questionKind: item.questionKind,
        orderIndex: item.orderIndex,
        body: item.body ?? null,
        updatedBy: userId,
      });
      if (!resource) throw new Error('the resource row was not created');
      return { id: resource.id, slug: resource.slug, label: resource.title };
    },
  }),
} satisfies Record<string, ImportEntry>;
