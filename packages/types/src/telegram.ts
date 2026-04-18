import { z } from 'zod';

export const TelegramUserSchema = z.object({
  id: z.number().int(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
  is_premium: z.boolean().optional(),
  photo_url: z.string().optional(),
});

export type TelegramUser = z.infer<typeof TelegramUserSchema>;

export const InitDataSchema = z.object({
  user: TelegramUserSchema.optional(),
  auth_date: z.number().int(),
  hash: z.string(),
  query_id: z.string().optional(),
  start_param: z.string().optional(),
});

export type InitData = z.infer<typeof InitDataSchema>;
