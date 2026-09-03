import { z } from 'zod';

export const promptFormSchema = z.object({
  task: z.union([z.literal(1), z.literal(2)]),
  format: z.enum(['academic', 'general']),
  promptText: z.string().trim().min(1, 'Required'),
});

export type PromptFormValues = z.infer<typeof promptFormSchema>;
