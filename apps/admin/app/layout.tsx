import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { themeStylesheet } from '@tb/ui';
import './admin.css';

export const metadata: Metadata = {
  title: { default: 'Back-office', template: '%s · Back-office' },
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Back-office UI is English for phase 1 (internal staff tool).
 * OPEN DECISION: German admin UI — strings are isolated per page for easy extraction.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeStylesheet() }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
