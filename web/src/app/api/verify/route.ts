import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

import {
  getClaimByCode,
  getClaimByTxSignature,
  listClaimsByWallet,
  type ClaimWithEvent,
} from '@/lib/supabase';

const schema = z
  .object({
    claimCode: z.string().trim().min(1).optional(),
    wallet: z.string().trim().min(1).optional(),
    txSignature: z.string().trim().min(1).optional(),
  })
  .refine((value) => value.claimCode || value.wallet || value.txSignature, {
    message: 'Provide at least one lookup field',
    path: ['claimCode'],
  });

const buildMatchPayload = (claim: ClaimWithEvent, source: string) => ({
  id: claim.id,
  code: claim.code,
  status: claim.status,
  minted: claim.status === 'claimed',
  wallet: claim.wallet,
  txSignature: claim.txSig,
  createdAt: claim.createdAt,
  updatedAt: claim.updatedAt,
  event: {
    id: claim.events.id,
    name: claim.events.name,
    description: claim.events.description,
    collectionMint: claim.events.collectionMint,
  },
  sources: [source],
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = schema.parse(await request.json());

    const matches = new Map<string, ReturnType<typeof buildMatchPayload>>();
    const warnings: string[] = [];

    const mergeMatch = (claim: ClaimWithEvent, source: string) => {
      const key = claim.id;
      const existing = matches.get(key);
      if (existing) {
        existing.sources = Array.from(new Set([...existing.sources, source]));
        existing.minted = existing.minted || claim.status === 'claimed';
        existing.wallet = existing.wallet ?? claim.wallet;
        existing.txSignature = existing.txSignature ?? claim.txSig;
        existing.updatedAt = claim.updatedAt;
        matches.set(key, existing);
        return;
      }

      matches.set(key, buildMatchPayload(claim, source));
    };

    if (payload.claimCode) {
      const claim = await getClaimByCode(payload.claimCode);
      if (claim) {
        mergeMatch(claim, 'claimCode');
      } else {
        warnings.push('No claim found for the provided code.');
      }
    }

    if (payload.wallet) {
      const claims = await listClaimsByWallet(payload.wallet);
      if (claims.length === 0) {
        warnings.push('No claimed NFTs found for that wallet.');
      }
      claims.forEach((claim) => mergeMatch(claim, 'wallet'));
    }

    if (payload.txSignature) {
      const claim = await getClaimByTxSignature(payload.txSignature);
      if (claim) {
        mergeMatch(claim, 'txSignature');
      } else {
        warnings.push('No claim found for that transaction signature.');
      }
    }

    return NextResponse.json({
      matches: [...matches.values()],
      warnings,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid verification payload', details: error.flatten() },
        { status: 400 },
      );
    }

    console.error('Failed to verify claim', error);
    return NextResponse.json({ error: 'Verification lookup failed' }, { status: 500 });
  }
}
