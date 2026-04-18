import { z } from 'zod';

export const LOCALES = ['uz', 'ru', 'en'] as const;
export const DEFAULT_LOCALE = 'ru' as const;

export const LocaleSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof LocaleSchema>;

export function resolveLocale(candidate: string | undefined | null): Locale {
  if (!candidate) return DEFAULT_LOCALE;
  const lower = candidate.toLowerCase().slice(0, 2);
  return LocaleSchema.safeParse(lower).success ? (lower as Locale) : DEFAULT_LOCALE;
}
