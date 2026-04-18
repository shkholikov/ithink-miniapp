import { z } from 'zod';

export const AmoConfigSchema = z.object({
  subdomain: z.string().min(1).optional(),
  accessToken: z.string().min(1).optional(),
  pipelineId: z.coerce.number().int().positive().optional(),
  responsibleUserId: z.coerce.number().int().positive().optional(),
  customFields: z
    .object({
      serviceId: z.coerce.number().int().positive().optional(),
      descriptionId: z.coerce.number().int().positive().optional(),
      tgUsernameId: z.coerce.number().int().positive().optional(),
      sourceId: z.coerce.number().int().positive().optional(),
    })
    .partial()
    .default({}),
});

export type AmoConfig = z.infer<typeof AmoConfigSchema>;

export interface CreateContactInput {
  name: string;
  phone: string;
  email?: string;
  tgUserId?: number;
}

export interface CreateLeadInput {
  name: string;
  contactId: string;
  service: string;
  description: string;
  tgUsername?: string;
  source: string;
}

export interface AmoEntityId {
  id: string;
}
