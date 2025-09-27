import { NextRequest, NextResponse } from 'next/server';

import { getClaimByCode } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  const { code } = await params;
  const claim = await getClaimByCode(code);

  if (!claim || !claim.events) {
    return NextResponse.json({ error: 'Claim code not found' }, { status: 404 });
  }

  return NextResponse.json({
    code: claim.code,
    status: claim.status,
    wallet: claim.wallet,
    event: {
      id: claim.events.id,
      name: claim.events.name,
      description: claim.events.description,
      collectionMint: claim.events.collectionMint,
    },
  });
}
