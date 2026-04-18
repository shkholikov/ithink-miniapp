import { z } from 'zod';
import { LocaleSchema } from './locale';
import { ServiceSlugSchema } from './service';

const nameSchema = z
  .string()
  .trim()
  .min(2, 'name too short')
  .max(80, 'name too long');

const phoneSchema = z
  .string()
  .trim()
  .min(6, 'phone too short')
  .max(20, 'phone too long')
  .regex(/^[+\d\s()\-]+$/, 'phone contains invalid characters');

// Email is optional. The form leaves blank inputs as "", so we accept either
// a valid email or an empty literal; the API route normalizes "" to undefined
// before passing it to the amoCRM client.
const emailSchema = z
  .union([z.string().trim().email().max(120), z.literal('')])
  .optional();

const descriptionSchema = z
  .string()
  .trim()
  .min(10, 'description too short')
  .max(2000, 'description too long');

export const LeadInputSchema = z.object({
  service: ServiceSlugSchema,
  description: descriptionSchema,
  name: nameSchema,
  phone: phoneSchema,
  email: emailSchema,
  locale: LocaleSchema,
});

export type LeadInput = z.infer<typeof LeadInputSchema>;

export const LeadSubmissionSchema = LeadInputSchema.extend({
  initData: z.string().min(1, 'missing Telegram initData'),
});

export type LeadSubmission = z.infer<typeof LeadSubmissionSchema>;

export const LeadResponseSchema = z.object({
  ok: z.literal(true),
  leadId: z.string(),
});

export type LeadResponse = z.infer<typeof LeadResponseSchema>;
