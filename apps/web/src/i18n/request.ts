import { getRequestConfig } from 'next-intl/server';
import { resolveLocale } from '@ithink/types';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = resolveLocale(requested ?? routing.defaultLocale);

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});
