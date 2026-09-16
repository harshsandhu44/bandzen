import type { RendererKey } from '@bandzen/exams/registry';
import type { ComponentType } from 'react';
import { Conversation, Recording } from './recording';
import {
  ChoiceCards,
  ChoiceSelect,
  Essay,
  FillBlank,
  FillBlankDrag,
  FillBlankSelect,
  MultiChoice,
  Reorder,
  SentenceBuilder,
  TextInput,
  TokenSelect,
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
  fill_blank_select: FillBlankSelect,
  fill_blank_drag: FillBlankDrag,
  reorder: Reorder,
  token_select: TokenSelect,
  sentence_builder: SentenceBuilder,
  recording: Recording,
  conversation: Conversation,
};
