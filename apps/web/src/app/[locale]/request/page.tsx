import { getTranslations } from 'next-intl/server';
import { services } from '@ithink/content';
import { TelegramBackButton } from '@/lib/telegram';
import { RequestForm, type ServiceOption } from './request-form';

interface Props {
  searchParams: Promise<{ service?: string }>;
}

export default async function RequestPage({ searchParams }: Props) {
  const t = await getTranslations();
  const { service: preselected } = await searchParams;

  const options: ServiceOption[] = services.map((s) => ({
    slug: s.slug,
    title: t(`services.${s.slug}.title`),
    color: s.color,
    icon: s.icon,
  }));

  return (
    <>
      <TelegramBackButton />

      <main className="flex flex-col gap-4 px-4 pb-6 pt-4">
        <header className="px-1">
          <h1 className="text-xl font-semibold">{t('request.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('request.subtitle')}</p>
        </header>

        <RequestForm options={options} preselected={preselected} />
      </main>
    </>
  );
}
