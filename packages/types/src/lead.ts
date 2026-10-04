import { z } from "zod";
import { LocaleSchema } from "./locale";
import { SERVICE_SLUGS, ServiceSlugSchema, type ServiceSlug } from "./service";

const nameSchema = z.string().trim().min(2, "name too short").max(80, "name too long");

const phoneSchema = z
	.string()
	.trim()
	.max(24, "phone too long")
	.regex(/^[+\d\s()\-]+$/, "phone contains invalid characters")
	.refine((v) => {
		const digits = v.replace(/\D/g, "").length;
		return digits >= 9 && digits <= 15;
	}, "phone must have 9-15 digits");

// Blank form inputs arrive as "", so optional text fields accept either a
// valid value or an empty literal.
const emailSchema = z.union([z.string().trim().email().max(120), z.literal("")]).optional();

const telegramSchema = z
	.union([
		z
			.string()
			.trim()
			.regex(/^@?[A-Za-z0-9_]{4,32}$/, "invalid telegram username"),
		z.literal("")
	])
	.optional();

const descriptionSchema = z.union([z.string().trim().max(2000, "description too long"), z.literal("")]).optional();

export const BUDGET_RANGES = ["lt_1k", "1k_5k", "5k_15k", "gt_15k", "unknown"] as const;
export const BudgetRangeSchema = z.enum(BUDGET_RANGES);
export type BudgetRange = z.infer<typeof BudgetRangeSchema>;

export const COMPANY_SIZES = ["1_10", "11_50", "51_200", "200_plus"] as const;
export const CompanySizeSchema = z.enum(COMPANY_SIZES);
export type CompanySize = z.infer<typeof CompanySizeSchema>;

export const LEAD_CHANNELS = ["site", "telegram_miniapp"] as const;
export type LeadChannel = (typeof LEAD_CHANNELS)[number];

export const LeadInputSchema = z.object({
	service: ServiceSlugSchema,
	description: descriptionSchema,
	name: nameSchema,
	phone: phoneSchema,
	email: emailSchema,
	telegram: telegramSchema,
	budget: BudgetRangeSchema.optional(),
	company_size: CompanySizeSchema.optional(),
	// Consent is given by submitting (privacy notice under the button); older
	// clients may still send the checkbox value.
	consent: z.boolean().optional(),
	locale: LocaleSchema
});

export type LeadInput = z.infer<typeof LeadInputSchema>;

export const LeadSubmissionSchema = LeadInputSchema.extend({
	initData: z.string().min(1, "missing Telegram initData")
});

export type LeadSubmission = z.infer<typeof LeadSubmissionSchema>;

const attributionValue = z.string().trim().max(500).optional();

export const AttributionSchema = z.object({
	utm_source: attributionValue,
	utm_medium: attributionValue,
	utm_campaign: attributionValue,
	utm_content: attributionValue,
	utm_term: attributionValue,
	fbclid: attributionValue,
	gclid: attributionValue,
	referrer: z.string().trim().max(2000).optional(),
	landing_page: z.string().trim().max(2000).optional()
});

export type Attribution = z.infer<typeof AttributionSchema>;

export const SiteLeadSubmissionSchema = LeadInputSchema.extend({
	page_url: z.string().trim().url().max(2000),
	attribution: AttributionSchema.optional(),
	event_id: z.string().uuid().optional(),
	// Optional while the site runs without a captcha; required once TURNSTILE_SECRET_KEY is set.
	turnstile_token: z.string().max(4096).optional(),
	website: z.string().optional()
});

export type SiteLeadSubmission = z.infer<typeof SiteLeadSubmissionSchema>;

export const LeadResponseSchema = z.object({
	ok: z.literal(true),
	leadId: z.number().int().nullable()
});

export type LeadResponse = z.infer<typeof LeadResponseSchema>;

export interface StartParam {
	source: string;
	campaign?: string;
	service?: ServiceSlug;
}

// Format: "<source>_<campaign>", e.g. "ig_msp_oct" -> source "ig", campaign "msp_oct".
// A service slug anywhere in the value preselects that service.
export function parseStartParam(raw: string | undefined | null): StartParam | null {
	const value = raw?.trim();
	if (!value) return null;
	const separator = value.indexOf("_");
	const source = separator === -1 ? value : value.slice(0, separator);
	const campaign = separator === -1 ? undefined : value.slice(separator + 1) || undefined;
	const service = SERVICE_SLUGS.find((slug) => value.includes(slug));
	return { source, campaign, service };
}
