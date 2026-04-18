import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

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
