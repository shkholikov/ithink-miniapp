import { z } from "zod";

const id = z.coerce.number().int().positive();

const enumMap = z.preprocess((raw) => {
	if (typeof raw !== "string" || !raw.trim()) return undefined;
	try {
		return JSON.parse(raw);
	} catch {
		return raw;
	}
}, z.record(z.string(), id).optional());

export const EnumFieldSchema = z.object({
	fieldId: id,
	enums: z.record(z.string(), id)
});

export type EnumField = z.infer<typeof EnumFieldSchema>;

export const AmoClientConfigSchema = z.object({
	subdomain: z.string().min(1).optional(),
	accessToken: z.string().min(1).optional()
});

export type AmoClientConfig = z.infer<typeof AmoClientConfigSchema>;

export const LeadPipelineConfigSchema = z.object({
	pipelineId: id,
	statusId: id,
	responsibleUserId: id.optional(),
	product: EnumFieldSchema.optional(),
	channel: EnumFieldSchema.optional(),
	budget: EnumFieldSchema.optional(),
	companySize: EnumFieldSchema.optional()
});

export type LeadPipelineConfig = z.infer<typeof LeadPipelineConfigSchema>;

const blank = (raw: unknown) => (raw === "" ? undefined : raw);
const optionalId = z.preprocess(blank, id.optional());

// Reads the AMOCRM_* variables. Enum maps are JSON, e.g. {"managed-it-services":123}.
export const AmoEnvSchema = z.object({
	AMOCRM_SUBDOMAIN: z.string().optional(),
	AMOCRM_ACCESS_TOKEN: z.string().optional(),
	AMOCRM_PIPELINE_ID: z.preprocess(blank, id.default(6434662)),
	AMOCRM_STATUS_ID: z.preprocess(blank, id.default(72345034)),
	AMOCRM_RESPONSIBLE_USER_ID: optionalId,
	AMOCRM_CF_PRODUCT_ID: optionalId,
	AMOCRM_PRODUCT_ENUMS: enumMap,
	AMOCRM_CF_CHANNEL_ID: optionalId,
	AMOCRM_CHANNEL_ENUMS: enumMap,
	AMOCRM_CF_BUDGET_ID: optionalId,
	AMOCRM_BUDGET_ENUMS: enumMap,
	AMOCRM_CF_COMPANY_SIZE_ID: optionalId,
	AMOCRM_COMPANY_SIZE_ENUMS: enumMap
});

export function parseAmoEnv(env: Record<string, string | undefined>): {
	client: AmoClientConfig;
	pipeline: LeadPipelineConfig;
} {
	const e = AmoEnvSchema.parse(env);
	const enumField = (fieldId?: number, enums?: Record<string, number>) => (fieldId && enums ? { fieldId, enums } : undefined);
	return {
		client: {
			subdomain: e.AMOCRM_SUBDOMAIN || undefined,
			accessToken: e.AMOCRM_ACCESS_TOKEN || undefined
		},
		pipeline: {
			pipelineId: e.AMOCRM_PIPELINE_ID,
			statusId: e.AMOCRM_STATUS_ID,
			responsibleUserId: e.AMOCRM_RESPONSIBLE_USER_ID,
			product: enumField(e.AMOCRM_CF_PRODUCT_ID, e.AMOCRM_PRODUCT_ENUMS),
			channel: enumField(e.AMOCRM_CF_CHANNEL_ID, e.AMOCRM_CHANNEL_ENUMS),
			budget: enumField(e.AMOCRM_CF_BUDGET_ID, e.AMOCRM_BUDGET_ENUMS),
			companySize: enumField(e.AMOCRM_CF_COMPANY_SIZE_ID, e.AMOCRM_COMPANY_SIZE_ENUMS)
		}
	};
}

export interface CustomFieldValue {
	field_id?: number;
	field_code?: string;
	values: Array<{ value?: string | number; enum_id?: number; enum_code?: string }>;
}

export interface NewContact {
	name: string;
	responsibleUserId?: number;
	customFields: CustomFieldValue[];
}

export interface CreateLeadComplexInput {
	name: string;
	pipelineId: number;
	statusId: number;
	responsibleUserId?: number;
	customFields: CustomFieldValue[];
	contact: { id: number } | NewContact;
}

export interface CreatedLead {
	leadId: number;
	contactId: number;
}

export interface CreateTaskInput {
	leadId: number;
	responsibleUserId?: number;
	completeTill: Date;
	text: string;
}
