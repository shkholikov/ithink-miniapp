import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import { missingProductionEnv, missingRecommendedEnv } from './src/lib/leads/required-env';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Vercel has no long-running process to fail at startup, so a production
// deploy without lead intake secrets fails at build time instead.
if (process.env.VERCEL_ENV === 'production') {
  const missing = missingProductionEnv();
  if (missing.length) {
    throw new Error(`Lead intake is misconfigured, missing env: ${missing.join(', ')}`);
  }
  const recommended = missingRecommendedEnv();
  if (recommended.length) {
    console.warn(`Lead intake runs degraded, missing env: ${recommended.join(', ')}`);
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ithink/types', '@ithink/content', '@ithink/amocrm'],
  allowedDevOrigins: [
    '*.ngrok-free.dev',
    '*.ngrok-free.app',
    '*.ngrok.app',
    '*.ngrok.io',
    '*.trycloudflare.com',
    '*.loca.lt',
  ],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Allow the mini app to be embedded inside Telegram's WebView
          { key: 'X-Frame-Options', value: 'ALLOW-FROM https://telegram.org' },
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://telegram.org https://web.telegram.org https://*.telegram.org",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
