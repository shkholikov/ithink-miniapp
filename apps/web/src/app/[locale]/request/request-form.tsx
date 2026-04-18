'use client';

import { useMemo, useState } from 'react';
import { useForm, Controller, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { LeadInputSchema, type LeadInput, type ServiceSlug } from '@ithink/types';
import { getWebApp, hapticError, hapticImpact, hapticSuccess } from '@/lib/telegram';
import { IconSquare } from '@/components/icon-square';
import { GroupedCard } from '@/components/grouped-card';
import { cn } from '@/lib/utils';

export interface ServiceOption {
  slug: ServiceSlug;
  title: string;
  icon: string;
  color: string;
}

type Step = 1 | 2 | 3 | 'done';

interface Props {
  options: ServiceOption[];
  preselected?: string;
}

export function RequestForm({ options, preselected }: Props) {
  const t = useTranslations('request');
  const locale = useLocale() as LeadInput['locale'];
  const initialService = options.find((o) => o.slug === preselected)?.slug;

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LeadInput>({
    resolver: zodResolver(LeadInputSchema),
    defaultValues: {
      service: initialService,
      description: '',
      name: '',
      phone: '',
      email: undefined,
      locale,
    },
    mode: 'onChange',
  });

  const [step, setStep] = useState<Step>(initialService ? 2 : 1);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const selectedService = watch('service');
  const description = watch('description');
  const selectedOption = useMemo(
    () => options.find((o) => o.slug === selectedService),
    [options, selectedService],
  );

  const onSubmit = handleSubmit(async (data) => {
    setSubmitting(true);
    setServerError(null);

    const webApp = getWebApp();
    const initData = webApp?.initData ?? '';

    if (!initData) {
      setServerError(t('errors.noTelegram'));
      setSubmitting(false);
      hapticError();
      return;
    }

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, initData }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setServerError(body?.error ?? t('errors.generic'));
        hapticError();
        setSubmitting(false);
        return;
      }

      hapticSuccess();
      setStep('done');
    } catch {
      setServerError(t('errors.generic'));
      hapticError();
    } finally {
      setSubmitting(false);
    }
  });

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-card px-6 py-10 text-center">
        <CheckCircle2 size={48} className="text-[color:var(--color-brand)]" />
        <h2 className="text-lg font-semibold">{t('success.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('success.body')}</p>
        <button
          type="button"
          onClick={() => getWebApp()?.close()}
          className="mt-2 rounded-full bg-[color:var(--color-brand)] px-6 py-3 text-sm font-semibold text-white"
        >
          {t('success.close')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <StepIndicator current={step} />

      {step === 1 ? (
        <Controller
          control={control}
          name="service"
          render={({ field }) => (
            <GroupedCard>
              {options.map((opt) => {
                const active = field.value === opt.slug;
                return (
                  <button
                    key={opt.slug}
                    type="button"
                    onClick={() => {
                      hapticImpact('light');
                      field.onChange(opt.slug);
                      setStep(2);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-white/5',
                      active && 'bg-white/5',
                    )}
                  >
                    <IconSquare icon={opt.icon} color={opt.color} />
                    <span className="flex-1 text-[0.9375rem] font-medium">{opt.title}</span>
                    {active ? (
                      <span className="text-[color:var(--color-brand)]">✓</span>
                    ) : null}
                  </button>
                );
              })}
            </GroupedCard>
          )}
        />
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-3">
          {selectedOption ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left"
            >
              <IconSquare icon={selectedOption.icon} color={selectedOption.color} />
              <span className="flex-1 text-[0.9375rem] font-medium">{selectedOption.title}</span>
              <span className="text-xs text-muted-foreground">{t('steps.service')}</span>
            </button>
          ) : null}

          <label className="flex flex-col gap-2">
            <span className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('fields.description')}
            </span>
            <textarea
              {...register('description')}
              rows={5}
              placeholder={t('fields.descriptionPlaceholder')}
              className="resize-none rounded-2xl bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)]/40"
            />
            {errors.description ? (
              <span className="px-1 text-xs text-red-400">{errors.description.message}</span>
            ) : null}
          </label>

          <button
            type="button"
            onClick={() => {
              if (description.trim().length < 10) {
                setValue('description', description, { shouldValidate: true });
                hapticError();
                return;
              }
              hapticImpact('light');
              setStep(3);
            }}
            className="mt-2 rounded-full bg-[color:var(--color-brand)] px-6 py-3 text-sm font-semibold text-white"
          >
            {t('steps.contact')} →
          </button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="flex flex-col gap-3">
          <InputField
            label={t('fields.name')}
            error={errors.name?.message}
            register={register('name')}
            autoComplete="name"
          />
          <InputField
            label={t('fields.phone')}
            error={errors.phone?.message}
            register={register('phone')}
            inputMode="tel"
            autoComplete="tel"
          />
          <InputField
            label={t('fields.email')}
            error={errors.email?.message}
            register={register('email')}
            inputMode="email"
            autoComplete="email"
            type="email"
          />

          {serverError ? (
            <p className="px-1 text-sm text-red-400">{serverError}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[color:var(--color-brand)] px-6 py-3 text-sm font-semibold text-white disabled:opacity-70"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{t('fields.submitting')}</span>
              </>
            ) : (
              <span>{t('fields.submit')}</span>
            )}
          </button>
        </div>
      ) : null}
    </form>
  );
}

function StepIndicator({ current }: { current: Step }) {
  if (current === 'done') return null;
  const steps: Step[] = [1, 2, 3];
  return (
    <div className="flex items-center gap-1.5 px-1">
      {steps.map((s) => (
        <span
          key={String(s)}
          className={cn(
            'h-1 flex-1 rounded-full bg-white/10 transition-colors',
            (current as number) >= (s as number) && 'bg-[color:var(--color-brand)]',
          )}
        />
      ))}
    </div>
  );
}

interface InputFieldProps {
  label: string;
  error?: string;
  register: UseFormRegisterReturn;
  inputMode?: 'text' | 'tel' | 'email';
  autoComplete?: string;
  type?: string;
}

function InputField({ label, error, register, inputMode, autoComplete, type }: InputFieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        {...register}
        type={type ?? 'text'}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className="rounded-2xl bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)]/40"
      />
      {error ? <span className="px-1 text-xs text-red-400">{error}</span> : null}
    </label>
  );
}
