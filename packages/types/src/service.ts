import { z } from 'zod';

export const SERVICE_SLUGS = [
  'it-infrastructure',
  'managed-it-services',
  'crm-sales-automation',
  'business-process-automation',
  'custom-software-development',
  'it-audit-consulting',
  'software-licenses',
  'corporate-training',
] as const;

export const ServiceSlugSchema = z.enum(SERVICE_SLUGS);
export type ServiceSlug = z.infer<typeof ServiceSlugSchema>;

export const ServiceSchema = z.object({
  id: z.string(),
  slug: ServiceSlugSchema,
  icon: z.string(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  tags: z.array(z.string()),
  relatedCaseIds: z.array(z.string()),
});

export type Service = z.infer<typeof ServiceSchema>;
