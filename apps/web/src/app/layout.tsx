import type { Metadata } from 'next';
import '@fontsource/lato/400.css';
import '@fontsource/lato/700.css';
import '@fontsource/playfair-display/500.css';
import '@fontsource/playfair-display/600.css';
import './globals.css';
export const metadata: Metadata = {
  title: 'RumahKita.id — Tempat untuk pulang',
  description: 'Temukan rumah, ajukan sewa, dan kelola kebutuhan hunian dalam satu tempat.',
  icons: { icon: '/favicon.svg' },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
