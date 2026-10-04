import { NextResponse } from "next/server";
import pino from "pino";
import { LeadIntakeError } from "@ithink/amocrm";
import { LeadSubmissionSchema, parseStartParam } from "@ithink/types";
import { getLeadService } from "@/lib/leads";
import { verifyInitData } from "@/lib/telegram/init-data";

export const runtime = "nodejs";

const logger = pino({ name: "api.lead" });

export async function POST(request: Request) {
	const botToken = process.env.TELEGRAM_BOT_TOKEN;
	if (!botToken) {
		logger.error("TELEGRAM_BOT_TOKEN is not set, rejecting lead");
		return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return NextResponse.json({ error: "invalid json" }, { status: 400 });
	}

	const parsed = LeadSubmissionSchema.safeParse(payload);
	if (!parsed.success) {
		return NextResponse.json({ error: "validation", issues: parsed.error.flatten() }, { status: 400 });
	}

	const { initData, consent: _consent, ...input } = parsed.data;

	const verification = verifyInitData(initData, botToken);
	if (!verification.ok) {
		logger.warn({ error: verification.error }, "initData verification failed");
		return NextResponse.json({ error: `auth: ${verification.error}` }, { status: 401 });
	}

	const startParam = verification.startParam;
	const utm = parseStartParam(startParam);

	try {
		const result = await getLeadService().createLead(
			{
				...input,
				email: input.email || undefined,
				telegram: undefined,
				startParam,
				tgUserId: verification.user?.id,
				tgUsername: verification.user?.username,
				attribution: utm ? { utm_source: utm.source, utm_campaign: utm.campaign } : undefined
			},
			"telegram_miniapp"
		);
		return NextResponse.json({ ok: true, leadId: result.leadId });
	} catch (err) {
		if (err instanceof LeadIntakeError) {
			return NextResponse.json({ error: "delivery failed" }, { status: 502 });
		}
		throw err;
	}
}
