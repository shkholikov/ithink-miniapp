import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { getServiceBySlug, services } from '@ithink/content';
import { Link } from '@/i18n/navigation';
import { TelegramBackButton } from '@/lib/telegram';
import { IconSquare } from '@/components/icon-square';

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  const t = await getTranslations();

  return (
    <>
      <TelegramBackButton />

      <main className="flex flex-col gap-5 px-4 pb-6 pt-4">
        <section className="rounded-3xl bg-card px-5 py-6">
          <IconSquare
            icon={service.icon}
            color={service.color}
            size={24}
            className="h-12 w-12 rounded-xl"
          />
          <h1 className="mt-4 text-xl font-semibold">
            {t(`services.${service.slug}.title`)}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(`services.${service.slug}.description`)}
          </p>
        </section>

        <Link
          href={`/request?service=${service.slug}`}
          className="group flex items-center justify-between rounded-2xl bg-[color:var(--color-brand)] px-5 py-4 text-white shadow-[0_20px_40px_-20px_rgba(55,125,255,0.6)]"
        >
          <span className="font-semibold">{t('services.detail.cta')}</span>
          <ArrowRight size={18} className="transition-transform group-active:translate-x-1" />
        </Link>
      </main>
    </>
  );
}
