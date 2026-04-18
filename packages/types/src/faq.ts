import { z } from 'zod';

export const FAQ_CATEGORIES = [
  'general',
  'pricing',
  'process',
  'support',
  'security',
] as const;

export const FaqCategorySchema = z.enum(FAQ_CATEGORIES);
export type FaqCategory = z.infer<typeof FaqCategorySchema>;

export const FaqEntrySchema = z.object({
  id: z.string(),
  category: FaqCategorySchema,
});

export type FaqEntry = z.infer<typeof FaqEntrySchema>;
