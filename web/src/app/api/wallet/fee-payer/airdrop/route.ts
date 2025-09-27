import { NextRequest, NextResponse } from 'next/server';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { ZodError, z } from 'zod';

import { getServerConfig } from '@/lib/env';
import { getFeePayer } from '@/lib/umi';

const schema = z
  .object({
    amount: z.number().min(0.1).max(2).optional(),
  })
  .optional();

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.parse(body) ?? {};
    const amount = parsed.amount ?? 1;

    const config = getServerConfig();
    const feePayer = getFeePayer();
    const address = feePayer.publicKey.toString();

    const connection = new Connection(config.SOLANA_RPC_URL, {
      commitment: 'confirmed',
    });

    const lamports = Math.round(amount * LAMPORTS_PER_SOL);
    const signature = await connection.requestAirdrop(new PublicKey(address), lamports);
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      {
        signature,
        ...latestBlockhash,
      },
      'confirmed',
    );

    return NextResponse.json({
      address,
      lamports,
      sol: lamports / LAMPORTS_PER_SOL,
      signature,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid amount requested', details: error.flatten() }, { status: 400 });
    }

    console.error('Failed to request airdrop', error);
    return NextResponse.json({ error: 'Unable to request airdrop' }, { status: 500 });
  }
}
