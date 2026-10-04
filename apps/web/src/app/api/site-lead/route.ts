import { NextResponse } from "next/server";
import pino from "pino";
import { LeadIntakeError } from "@ithink/amocrm";
import { SiteLeadSubmissionSchema } from "@ithink/types";
import { getLeadService } from "@/lib/leads";
import { verifyTurnstile } from "@/lib/leads/turnstile";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";

const logger = pino({ name: "api.site-lead" });
const allowRequest = createRateLimiter(5, 10 * 60 * 1000);

const DEFAULT_ORIGINS = "https://ithink.uz,https://www.ithink.uz";

function isAllowedOrigin(origin: string | null): origin is string {
	if (!origin) return false;
	const allowed = (process.env.SITE_ORIGINS || DEFAULT_ORIGINS).split(",").map((o) => o.trim());
	if (allowed.includes(origin)) return true;
	return process.env.NODE_ENV !== "production" && /^http:\/\/localhost(:\d+)?$/.test(origin);
}

function corsHeaders(origin: string): HeadersInit {
	return {
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Max-Age": "86400",
		Vary: "Origin"
	};
}

export async function OPTIONS(request: Request) {
	const origin = request.headers.get("origin");
	if (!isAllowedOrigin(origin)) return new NextResponse(null, { status: 403 });
	return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
	const origin = request.headers.get("origin");
	if (!isAllowedOrigin(origin)) {
		return NextResponse.json({ error: "origin not allowed" }, { status: 403 });
	}
	const headers = corsHeaders(origin);
	const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

	const ip = clientIp(request);
	if (!allowRequest(ip)) {
		return reply({ error: "too many requests" }, 429);
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return reply({ error: "invalid json" }, 400);
	}

	const honeypot = (payload as { website?: unknown } | null)?.website;
	if (typeof honeypot === "string" && honeypot.trim() !== "") {
		logger.info({ outcome: "honeypot" }, "site lead dropped");
		return reply({ ok: true, leadId: null });
	}

	const parsed = SiteLeadSubmissionSchema.safeParse(payload);
	if (!parsed.success) {
		return reply({ error: "validation", issues: parsed.error.flatten() }, 400);
	}

	const { turnstile_token, website: _website, consent: _consent, event_id: _eventId, page_url, ...input } = parsed.data;

	const secret = process.env.TURNSTILE_SECRET_KEY;
	if (secret) {
		if (!(await verifyTurnstile(turnstile_token, secret, ip === "unknown" ? undefined : ip))) {
			return reply({ error: "captcha failed" }, 403);
		}
	} else {
		logger.warn("TURNSTILE_SECRET_KEY is not set, skipping captcha check outside production");
	}

	try {
		const result = await getLeadService().createLead(
			{ ...input, email: input.email || undefined, telegram: input.telegram || undefined, pageUrl: page_url },
			"site"
		);
		return reply({ ok: true, leadId: result.leadId });
	} catch (err) {
		if (err instanceof LeadIntakeError) {
			return reply({ error: "delivery failed" }, 502);
		}
		throw err;
	}
}
