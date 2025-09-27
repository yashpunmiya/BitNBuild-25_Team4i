import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { ZodError, z } from 'zod';

import { buildClaimTransaction } from '@/lib/solana';
import { getClaimByCode, markClaimFailed, reserveClaim } from '@/lib/supabase';

const schema = z.object({
  code: z.string().min(1),
  owner: z.string().min(32),
  metadataUri: z.string().url(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  let payload: z.infer<typeof schema> | undefined;
  let reserved = false;

  try {
    payload = schema.parse(await request.json());
    new PublicKey(payload.owner);

    const claim = await getClaimByCode(payload.code);

    if (!claim || !claim.events) {
      return NextResponse.json({ error: 'Claim code not found' }, { status: 404 });
    }

    const claimAvailable =
      claim.status === 'unused' || (claim.status === 'reserved' && (claim.wallet == null || claim.wallet === ''));

    if (!claimAvailable) {
      return NextResponse.json({ error: 'Claim code not available' }, { status: 409 });
    }

    const reservedClaim = await reserveClaim(payload.code, payload.owner);
    if (!reservedClaim) {
      return NextResponse.json({ error: 'Claim code already reserved' }, { status: 409 });
    }

    reserved = true;

    const tx = await buildClaimTransaction({
      event: claim.events,
      owner: payload.owner,
      metadataUri: payload.metadataUri,
    });

    return NextResponse.json(tx);
  } catch (error) {
    if (reserved && payload) {
      try {
        await markClaimFailed(payload.code);
      } catch (rollbackError) {
        console.error('Failed to rollback claim reservation', rollbackError);
      }
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: error.flatten() },
        { status: 400 },
      );
    }

    if (error instanceof Error && /Invalid public key/.test(error.message)) {
      return NextResponse.json({ error: 'Invalid owner public key' }, { status: 400 });
    }

    console.error('Failed to build claim transaction', error);
    return NextResponse.json({ error: 'Failed to build transaction' }, { status: 500 });
  }
}




