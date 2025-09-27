'use client';

import type { ReactNode } from 'react';

import { SolanaWalletProvider } from './SolanaWalletProvider';

type Props = {
  children: ReactNode;
};

export function RootProviders({ children }: Props) {
  return <SolanaWalletProvider>{children}</SolanaWalletProvider>;
}
