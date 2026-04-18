import { z } from 'zod';
import { ServiceSlugSchema } from './service';

export const CaseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  clientId: z.string(),
  serviceIds: z.array(ServiceSlugSchema).min(1),
  tech: z.array(z.string()),
  images: z.array(z.string()),
  year: z.number().int().min(2015).max(2100),
});

export type Case = z.infer<typeof CaseSchema>;
