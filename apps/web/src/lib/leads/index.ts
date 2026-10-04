import pino from "pino";
import { createAmoCrmClient, createLeadService, parseAmoEnv, type LeadService } from "@ithink/amocrm";
import type { ServiceSlug } from "@ithink/types";
import ru from "../../../messages/ru.json";
import { missingProductionEnv, missingRecommendedEnv } from "./required-env";

export function assertLeadIntakeEnv(): void {
	const missing = missingProductionEnv();
	if (missing.length) {
		throw new Error(`Lead intake is misconfigured, missing env: ${missing.join(", ")}`);
	}
	const recommended = missingRecommendedEnv();
	if (recommended.length) {
		console.warn(`Lead intake runs degraded, missing env: ${recommended.join(", ")}`);
	}
	getLeadService();
}

const serviceTitles = ru.services as unknown as Record<string, { title?: string } | undefined>;

function serviceLabel(slug: ServiceSlug): string {
	return serviceTitles[slug]?.title ?? slug;
}

async function sendFallback(text: string): Promise<void> {
	const token = process.env.TELEGRAM_BOT_TOKEN;
	const chatId = process.env.SALES_FALLBACK_CHAT_ID;
	if (!token || !chatId) throw new Error("fallback chat is not configured");

	const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true })
	});
	if (!res.ok) throw new Error(`Telegram sendMessage failed with ${res.status}`);
}

let service: LeadService | undefined;

// Built lazily so `next build` can import the routes without production secrets.
export function getLeadService(): LeadService {
	if (service) return service;
	const logger = pino({ name: "leads" });
	const config = parseAmoEnv(process.env);
	service = createLeadService({
		client: createAmoCrmClient(config.client, { logger }),
		pipeline: config.pipeline,
		sendFallback,
		serviceLabel,
		logger
	});
	return service;
}
