import type { Case } from '@ithink/types';

export const cases: readonly Case[] = [
  {
    id: 'case-aslzar-nps',
    slug: 'aslzar-nps-bot',
    clientId: 'aslzar',
    serviceIds: ['custom-software-development', 'business-process-automation'],
    tech: ['grammY', 'Node.js', 'PostgreSQL'],
    images: ['/cases/aslzar-nps/cover.jpg'],
    year: 2025,
  },
  {
    id: 'case-sample-crm-rollout',
    slug: 'sample-crm-rollout',
    clientId: 'sample-client',
    serviceIds: ['crm-sales-automation'],
    tech: ['amoCRM', 'webhooks', 'integration'],
    images: ['/cases/sample-crm-rollout/cover.jpg'],
    year: 2025,
  },
  {
    id: 'case-sample-msp',
    slug: 'sample-msp-contract',
    clientId: 'sample-client',
    serviceIds: ['managed-it-services', 'it-infrastructure'],
    tech: ['Zabbix', '24/7 monitoring'],
    images: ['/cases/sample-msp/cover.jpg'],
    year: 2024,
  },
] as const;

export function getCaseBySlug(slug: string): Case | undefined {
  return cases.find((c) => c.slug === slug);
}

export function getCasesByService(serviceSlug: string): readonly Case[] {
  return cases.filter((c) => c.serviceIds.includes(serviceSlug as Case['serviceIds'][number]));
}
