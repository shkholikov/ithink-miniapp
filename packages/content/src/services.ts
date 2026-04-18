import type { Service } from '@ithink/types';

export const services: readonly Service[] = [
  {
    id: 'svc-it-infrastructure',
    slug: 'it-infrastructure',
    icon: 'Server',
    color: '#ef4444',
    tags: ['infrastructure', 'servers', 'networks'],
    relatedCaseIds: [],
  },
  {
    id: 'svc-managed-it-services',
    slug: 'managed-it-services',
    icon: 'Shield',
    color: '#22c55e',
    tags: ['msp', 'monitoring', 'support'],
    relatedCaseIds: [],
  },
  {
    id: 'svc-crm-sales-automation',
    slug: 'crm-sales-automation',
    icon: 'TrendingUp',
    color: '#a855f7',
    tags: ['amocrm', 'bitrix24', 'sales'],
    relatedCaseIds: [],
  },
  {
    id: 'svc-business-process-automation',
    slug: 'business-process-automation',
    icon: 'Workflow',
    color: '#f59e0b',
    tags: ['automation', 'bots', 'integrations', 'ai'],
    relatedCaseIds: [],
  },
  {
    id: 'svc-custom-software-development',
    slug: 'custom-software-development',
    icon: 'Code',
    color: '#377dff',
    tags: ['web', 'telegram', 'mini-apps'],
    relatedCaseIds: [],
  },
  {
    id: 'svc-it-audit-consulting',
    slug: 'it-audit-consulting',
    icon: 'ClipboardCheck',
    color: '#14b8a6',
    tags: ['audit', 'consulting'],
    relatedCaseIds: [],
  },
  {
    id: 'svc-software-licenses',
    slug: 'software-licenses',
    icon: 'Package',
    color: '#64748b',
    tags: ['microsoft', 'security', 'design'],
    relatedCaseIds: [],
  },
  {
    id: 'svc-corporate-training',
    slug: 'corporate-training',
    icon: 'GraduationCap',
    color: '#ec4899',
    tags: ['training', 'certification'],
    relatedCaseIds: [],
  },
] as const;

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}
