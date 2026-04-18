import { getTranslations } from 'next-intl/server';
import { faqEntries } from '@ithink/content';
import type { FaqCategory } from '@ithink/types';
import { TelegramBackButton } from '@/lib/telegram';
import { GroupedCard, SectionLabel } from '@/components/grouped-card';
import { ChatWithSalesButton } from './chat-with-sales-button';
import { FaqItem } from './faq-item';

export default async function FAQPage() {
  const t = await getTranslations();

  const grouped = faqEntries.reduce<Record<FaqCategory, typeof faqEntries>>(
    (acc, entry) => {
      const existing = acc[entry.category] ?? [];
      acc[entry.category] = [...existing, entry];
      return acc;
    },
    {} as Record<FaqCategory, typeof faqEntries>,
  );

  const categoryOrder: FaqCategory[] = ['general', 'pricing', 'process', 'support', 'security'];

  return (
    <>
      <TelegramBackButton />

      <main className="flex flex-col gap-4 px-4 pb-6 pt-4">
        <header className="px-1">
          <h1 className="text-xl font-semibold">{t('faq.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('faq.subtitle')}</p>
        </header>

        {categoryOrder.map((category) => {
          const entries = grouped[category];
          if (!entries || entries.length === 0) return null;
          return (
            <section key={category}>
              <SectionLabel>{t(`faq.categories.${category}`)}</SectionLabel>
              <GroupedCard>
                {entries.map((entry) => (
                  <FaqItem
                    key={entry.id}
                    question={t(`faq.entries.${entry.id}.q`)}
                    answer={t(`faq.entries.${entry.id}.a`)}
                  />
                ))}
              </GroupedCard>
            </section>
          );
        })}

        <section className="rounded-3xl bg-card px-5 py-5">
          <div className="text-sm font-semibold">{t('faq.chatWithSales.title')}</div>
          <div className="mt-1 text-sm text-muted-foreground">{t('faq.chatWithSales.body')}</div>
          <div className="mt-4">
            <ChatWithSalesButton label={t('faq.chatWithSales.cta')} />
          </div>
        </section>
      </main>
    </>
  );
}
