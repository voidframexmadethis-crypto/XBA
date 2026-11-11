import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '@/components/game/AuthContext';

export const metadata: Metadata = {
  title: 'XBA: X-Basketball Association',
  description: 'The ultimate elite basketball league. Rise through the ranks, customize your gear with AI, and dominate the global leaderboards.',
  openGraph: {
    title: 'XBA: X-Basketball Association',
    description: 'The ultimate elite basketball league.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XBA: X-Basketball Association',
    description: 'The ultimate elite basketball league.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
