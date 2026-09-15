import type { RendererKey } from '@bandzen/exams/registry';
import type { ComponentType } from 'react';
import { Conversation, Recording } from './recording';
import {
  ChoiceCards,
  ChoiceSelect,
  Essay,
  FillBlank,
  MultiChoice,
  Reorder,
  SentenceBuilder,
  TextInput,
  type ResponseRendererProps,
} from './responses';

/**
 * Renderer key → component. Typed as a full `Record`, so a renderer added to
 * `@bandzen/exams` without a component here fails the build. A new task type
 * that reuses an existing control is a definition change only.
 */
export const RESPONSE_RENDERERS: Record<
  RendererKey,
  ComponentType<ResponseRendererProps>
> = {
  choice_cards: ChoiceCards,
  choice_select: ChoiceSelect,
  multi_choice: MultiChoice,
  text_input: TextInput,
  essay: Essay,
  fill_blank: FillBlank,
  reorder: Reorder,
  sentence_builder: SentenceBuilder,
  recording: Recording,
  conversation: Conversation,
};
