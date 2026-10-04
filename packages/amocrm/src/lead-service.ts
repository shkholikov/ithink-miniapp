import type { Logger } from "pino";
import type { Attribution, BudgetRange, LeadChannel, Locale, ServiceSlug } from "@ithink/types";
import type { AmoCrmClient } from "./client";
import { CONTACT_FIELDS, LEAD_FIELDS } from "./fields";
import { normalizePhone } from "./phone";
import { taskDueAt } from "./schedule";
import type { CustomFieldValue, EnumField, LeadPipelineConfig } from "./types";

export interface LeadRequest {
	service: ServiceSlug;
	name: string;
	phone: string;
	email?: string;
	telegram?: string;
	description: string;
	budget?: BudgetRange;
	locale: Locale;
	pageUrl?: string;
	startParam?: string;
	tgUserId?: number;
	tgUsername?: string;
	attribution?: Attribution;
}

export type LeadOutcome = "created" | "appended" | "fallback";

export interface LeadResult {
	leadId: number | null;
	outcome: LeadOutcome;
}

export class LeadIntakeError extends Error {
	constructor() {
		super("lead could not be delivered to amoCRM or the fallback chat");
		this.name = "LeadIntakeError";
	}
}

export interface LeadServiceDeps {
	client: AmoCrmClient;
	pipeline: LeadPipelineConfig;
	sendFallback: (text: string) => Promise<void>;
	serviceLabel: (slug: ServiceSlug) => string;
	logger: Logger;
	now?: () => Date;
}

const CHANNEL_LABELS: Record<LeadChannel, string> = {
	site: "Сайт",
	telegram_miniapp: "Telegram Mini App"
};

const BUDGET_LABELS: Record<BudgetRange, string> = {
	lt_1k: "до $1 000",
	"1k_5k": "$1 000–5 000",
	"5k_15k": "$5 000–15 000",
	gt_15k: "более $15 000",
	unknown: "не знаю"
};

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "referrer", "fbclid", "gclid"] as const;

export function createLeadService(deps: LeadServiceDeps) {
	const { client, pipeline, logger } = deps;
	const now = deps.now ?? (() => new Date());

	async function addFollowUp(leadId: number, note: string) {
		await client.addNote(leadId, note);
		await client.addTask({
			leadId,
			responsibleUserId: pipeline.responsibleUserId,
			completeTill: taskDueAt(now()),
			text: "Связаться с клиентом по новой заявке"
		});
	}

	async function deliver(req: LeadRequest, channel: LeadChannel, phone: string): Promise<LeadResult> {
		const label = deps.serviceLabel(req.service);
		const contact = await client.findContactByPhone(phone);

		if (contact) {
			const open = await client.findOpenLead(contact.id, pipeline.pipelineId);
			if (open) {
				await addFollowUp(open.id, buildNote(req, channel, label, { repeat: true }));
				return { leadId: open.id, outcome: "appended" };
			}
		}

		const { leadId } = await client.createLeadComplex({
			name: `${label} — ${req.name}`,
			pipelineId: pipeline.pipelineId,
			statusId: pipeline.statusId,
			responsibleUserId: pipeline.responsibleUserId,
			customFields: leadFields(req, channel, pipeline),
			contact: contact ?? {
				name: req.name,
				responsibleUserId: pipeline.responsibleUserId,
				customFields: contactFields(req, phone)
			}
		});

		try {
			await addFollowUp(leadId, buildNote(req, channel, label, { repeat: false }));
		} catch (err) {
			logger.error({ leadId, err: errorInfo(err) }, "lead follow-up failed");
			await deps
				.sendFallback(`Сделка #${leadId} создана, но примечание и задача не добавлены.\n\n${buildSummary(req, channel, label)}`)
				.catch((fallbackErr: unknown) => logger.error({ leadId, err: errorInfo(fallbackErr) }, "follow-up fallback failed"));
		}

		return { leadId, outcome: "created" };
	}

	async function createLead(req: LeadRequest, channel: LeadChannel): Promise<LeadResult> {
		const phone = normalizePhone(req.phone);

		try {
			const result = await deliver(req, channel, phone);
			logger.info({ leadId: result.leadId, service: req.service, channel, outcome: result.outcome, stub: client.isStub }, "lead processed");
			return result;
		} catch (err) {
			logger.error({ service: req.service, channel, err: errorInfo(err) }, "amoCRM delivery failed");
		}

		try {
			await deps.sendFallback(`Заявка не попала в amoCRM.\n\n${buildSummary(req, channel, deps.serviceLabel(req.service))}`);
		} catch (err) {
			logger.error({ service: req.service, channel, outcome: "lost", err: errorInfo(err) }, "fallback delivery failed");
			throw new LeadIntakeError();
		}

		logger.info({ leadId: null, service: req.service, channel, outcome: "fallback" }, "lead processed");
		return { leadId: null, outcome: "fallback" };
	}

	return { createLead };
}

export type LeadService = ReturnType<typeof createLeadService>;

function enumValue(field: EnumField | undefined, key: string | undefined): CustomFieldValue | null {
	const enumId = field && key ? field.enums[key] : undefined;
	return field && enumId ? { field_id: field.fieldId, values: [{ enum_id: enumId }] } : null;
}

function leadFields(req: LeadRequest, channel: LeadChannel, pipeline: LeadPipelineConfig): CustomFieldValue[] {
	const fields: Array<CustomFieldValue | null> = [
		enumValue(pipeline.product, req.service),
		enumValue(pipeline.channel, channel),
		enumValue(pipeline.budget, req.budget),
		req.tgUserId ? { field_id: LEAD_FIELDS.tgUserId, values: [{ value: String(req.tgUserId) }] } : null,
		...UTM_KEYS.map((key) => {
			const value = req.attribution?.[key];
			return value ? { field_id: LEAD_FIELDS[key], values: [{ value }] } : null;
		})
	];
	return fields.filter((f): f is CustomFieldValue => f !== null);
}

function contactFields(req: LeadRequest, phone: string): CustomFieldValue[] {
	const fields: CustomFieldValue[] = [{ field_code: "PHONE", values: [{ value: `+${phone}`, enum_code: "WORK" }] }];
	if (req.email) fields.push({ field_code: "EMAIL", values: [{ value: req.email, enum_code: "WORK" }] });
	const username = telegramUsername(req);
	if (username) fields.push({ field_id: CONTACT_FIELDS.tgUsername, values: [{ value: username }] });
	return fields;
}

function telegramUsername(req: LeadRequest): string | undefined {
	return (req.tgUsername ?? req.telegram)?.replace(/^@/, "") || undefined;
}

function lines(entries: Array<[string, string | number | undefined]>): string {
	return entries
		.filter(([, value]) => value !== undefined && value !== "")
		.map(([key, value]) => `${key}: ${value}`)
		.join("\n");
}

function buildNote(req: LeadRequest, channel: LeadChannel, label: string, { repeat }: { repeat: boolean }): string {
	const username = telegramUsername(req);
	const header = repeat ? `Повторная заявка (${CHANNEL_LABELS[channel]})` : `Заявка (${CHANNEL_LABELS[channel]})`;
	const contact: Array<[string, string | undefined]> = repeat
		? [
				["Имя", req.name],
				["Телефон", req.phone],
				["Email", req.email]
			]
		: [];
	return [
		header,
		lines([...contact, ["Услуга", label], ["Бюджет", req.budget && BUDGET_LABELS[req.budget]]]),
		`Описание:\n${req.description}`,
		lines([
			["Язык", req.locale],
			["Страница", req.pageUrl],
			["Точка входа", req.attribution?.landing_page],
			["start_param", req.startParam],
			["Telegram", username && `@${username}`]
		])
	]
		.filter(Boolean)
		.join("\n\n");
}

function buildSummary(req: LeadRequest, channel: LeadChannel, label: string): string {
	const username = telegramUsername(req);
	return [
		lines([
			["Канал", CHANNEL_LABELS[channel]],
			["Имя", req.name],
			["Телефон", req.phone],
			["Email", req.email],
			["Telegram", username && `@${username}`],
			["Telegram ID", req.tgUserId],
			["Услуга", label],
			["Бюджет", req.budget && BUDGET_LABELS[req.budget]]
		]),
		`Описание:\n${req.description}`,
		lines([
			["Язык", req.locale],
			["Страница", req.pageUrl],
			["start_param", req.startParam],
			...UTM_KEYS.map((key): [string, string | undefined] => [key, req.attribution?.[key]])
		])
	]
		.filter(Boolean)
		.join("\n\n");
}

function errorInfo(err: unknown): { name: string; status?: number } {
	if (err instanceof Error) {
		const status = (err as { status?: unknown }).status;
		return { name: err.name, status: typeof status === "number" ? status : undefined };
	}
	return { name: typeof err };
}
