import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { RootProviders } from '@/components/providers/RootProviders';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Proof of Presence',
  description: 'QR-based NFT minting experience for live events on Solana.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}

