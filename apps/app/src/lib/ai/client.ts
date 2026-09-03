import 'server-only';

// The client now lives in @bandzen/ai (the offline scripts and node --test need
// it without the server-only guard); this keeps the guard on the app path.
export { openai } from '@bandzen/ai/client';
