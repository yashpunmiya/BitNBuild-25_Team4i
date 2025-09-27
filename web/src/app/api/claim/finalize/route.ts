import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

import { finalizeClaimTransaction } from '@/lib/solana';
import { finalizeClaim, getClaimByCode, markClaimFailed } from '@/lib/supabase';

const schema = z.object({
  code: z.string().min(1),
  signedTx: z.string().min(1),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  let payload: z.infer<typeof schema> | undefined;
  let broadcasted = false;

  try {
    payload = schema.parse(await request.json());
    const claim = await getClaimByCode(payload.code);

    if (!claim) {
      return NextResponse.json({ error: 'Claim code not found' }, { status: 404 });
    }

    if (claim.status !== 'reserved' || !claim.wallet) {
      return NextResponse.json({ error: 'Claim code is not awaiting finalization' }, { status: 409 });
    }

    const signature = await finalizeClaimTransaction(payload.signedTx);
    broadcasted = true;

    await finalizeClaim(payload.code, signature);

    return NextResponse.json({ signature });
  } catch (error) {
    if (!broadcasted && payload) {
      try {
        await markClaimFailed(payload.code);
      } catch (rollbackError) {
        console.error('Failed to rollback claim after finalize error', rollbackError);
      }
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: error.flatten() },
        { status: 400 },
      );
    }

    console.error('Failed to finalize claim', error);
    return NextResponse.json({ error: 'Failed to finalize claim' }, { status: 500 });
  }
}

