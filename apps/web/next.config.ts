import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Render <title>/<meta> in the initial HTML for every client (not streamed later), so screen
  // readers announce the page title immediately (WCAG 2.4.2).
  htmlLimitedBots: /.*/,
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ['i18next', 'intl-messageformat'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ];
  },
};

export default config;
