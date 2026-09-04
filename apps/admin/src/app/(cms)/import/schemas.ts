/**
 * The content-file schemas and helpers now live in `@bandzen/ai/schemas` —
 * one copy shared by the offline generation pipeline, the in-app "Generate
 * with AI" flow, and this import screen. This file is the admin-facing
 * re-export so existing import paths keep working.
 *
 * Drift protection stays here: `schemas.test.ts` parses the real
 * `apps/app/content/**` JSON against these.
 */
export {
  MAX_ITEMS,
  passageSchema,
  listeningTrackSchema,
  speakingTestSchema,
  writingPromptSchema,
  lessonSchema,
  lessonBlockSchema,
  resourceSchema,
  parseItems,
  findSlugClashes,
  type ParseResult,
} from '@bandzen/ai/schemas';
