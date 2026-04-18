import { NextResponse } from 'next/server';
import pino from 'pino';
import { LeadSubmissionSchema } from '@ithink/types';
import { createAmoCrmClient } from '@ithink/amocrm';
import { verifyInitData } from '@/lib/telegram/init-data';

export const runtime = 'nodejs';

const logger = pino({ name: 'api.lead' });

const amo = createAmoCrmClient(
  {
    subdomain: process.env.AMOCRM_SUBDOMAIN,
    accessToken: process.env.AMOCRM_ACCESS_TOKEN,
    pipelineId: process.env.AMOCRM_PIPELINE_ID
      ? Number(process.env.AMOCRM_PIPELINE_ID)
      : undefined,
    responsibleUserId: process.env.AMOCRM_RESPONSIBLE_USER_ID
      ? Number(process.env.AMOCRM_RESPONSIBLE_USER_ID)
      : undefined,
    customFields: {
      serviceId: process.env.AMOCRM_CF_SERVICE_ID
        ? Number(process.env.AMOCRM_CF_SERVICE_ID)
        : undefined,
      descriptionId: process.env.AMOCRM_CF_DESCRIPTION_ID
        ? Number(process.env.AMOCRM_CF_DESCRIPTION_ID)
        : undefined,
      tgUsernameId: process.env.AMOCRM_CF_TG_USERNAME_ID
        ? Number(process.env.AMOCRM_CF_TG_USERNAME_ID)
        : undefined,
      sourceId: process.env.AMOCRM_CF_SOURCE_ID
        ? Number(process.env.AMOCRM_CF_SOURCE_ID)
        : undefined,
    },
  },
  { logger },
);

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    logger.error('TELEGRAM_BOT_TOKEN is not set — rejecting lead');
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = LeadSubmissionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { initData, ...input } = parsed.data;

  const verification = verifyInitData(initData, botToken);
  if (!verification.ok) {
    logger.warn({ error: verification.error }, 'initData verification failed');
    return NextResponse.json({ error: `auth: ${verification.error}` }, { status: 401 });
  }

  const tgUsername = verification.user?.username;
  const tgUserId = verification.user?.id;

  const contact = await amo.createContact({
    name: input.name,
    phone: input.phone,
    email: input.email || undefined,
    tgUserId,
  });

  const lead = await amo.createLead({
    name: `${input.name} — ${input.service}`,
    contactId: contact.id,
    service: input.service,
    description: input.description,
    tgUsername,
    source: 'telegram_miniapp',
  });

  logger.info(
    { leadId: lead.id, contactId: contact.id, service: input.service, tgUserId, stub: amo.isStub },
    'lead created',
  );

  return NextResponse.json({ ok: true, leadId: lead.id });
}
