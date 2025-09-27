'use client';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { useMemo } from 'react';

import '@solana/wallet-adapter-react-ui/styles.css';

const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

if (!endpoint) {
  throw new Error('NEXT_PUBLIC_SOLANA_RPC_URL is not set');
}

type Props = {
  children: React.ReactNode;
};

export function SolanaWalletProvider({ children }: Props) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed' }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
