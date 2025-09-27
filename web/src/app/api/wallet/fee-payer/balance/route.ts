import { NextResponse } from 'next/server';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

import { getServerConfig } from '@/lib/env';
import { getFeePayer } from '@/lib/umi';

export async function GET(): Promise<NextResponse> {
  try {
    const config = getServerConfig();
    const feePayer = getFeePayer();
    const address = feePayer.publicKey.toString();

    const connection = new Connection(config.SOLANA_RPC_URL, {
      commitment: 'confirmed',
    });

    const lamports = await connection.getBalance(new PublicKey(address));

    return NextResponse.json({
      address,
      lamports,
      sol: lamports / LAMPORTS_PER_SOL,
    });
  } catch (error) {
    console.error('Failed to fetch fee payer balance', error);
    return NextResponse.json({ error: 'Unable to load fee payer balance' }, { status: 500 });
  }
}
