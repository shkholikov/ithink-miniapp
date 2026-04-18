import type { FaqEntry } from '@ithink/types';

export const faqEntries: readonly FaqEntry[] = [
  { id: 'faq-what-we-do', category: 'general' },
  { id: 'faq-response-time', category: 'support' },
  { id: 'faq-pricing-model', category: 'pricing' },
  { id: 'faq-project-timeline', category: 'process' },
  { id: 'faq-data-security', category: 'security' },
  { id: 'faq-payment-terms', category: 'pricing' },
  { id: 'faq-post-launch-support', category: 'support' },
  { id: 'faq-nda', category: 'security' },
] as const;
