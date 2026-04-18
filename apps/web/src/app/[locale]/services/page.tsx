import { getTranslations } from 'next-intl/server';
import { services } from '@ithink/content';
import { Link } from '@/i18n/navigation';
import { TelegramBackButton } from '@/lib/telegram';
import { GroupedCard, GroupedCardRow } from '@/components/grouped-card';
import { IconSquare } from '@/components/icon-square';

export default async function ServicesPage() {
  const t = await getTranslations();

  return (
    <>
      <TelegramBackButton />

      <main className="flex flex-col gap-4 px-4 pb-6 pt-4">
        <header className="px-1">
          <h1 className="text-xl font-semibold">{t('services.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('services.subtitle')}</p>
        </header>

        <GroupedCard>
          {services.map((service) => (
            <Link key={service.id} href={`/services/${service.slug}`} className="block">
              <GroupedCardRow
                as="div"
                leading={<IconSquare icon={service.icon} color={service.color} />}
                title={t(`services.${service.slug}.title`)}
                subtitle={t(`services.${service.slug}.short`)}
              />
            </Link>
          ))}
        </GroupedCard>
      </main>
    </>
  );
}
