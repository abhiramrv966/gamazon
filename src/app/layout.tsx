import type { Metadata } from 'next';
import './globals.css';
import './community-theme.css';
export const metadata: Metadata = {
  title: 'Gamazon — Console game sharing',
  description: 'Find, offer, and exchange physical console games with local community members.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
