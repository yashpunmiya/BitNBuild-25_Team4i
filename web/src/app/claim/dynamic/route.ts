import { NextRequest, NextResponse } from 'next/server';

import { allocateClaimCode } from '@/lib/supabase';

const DEFAULT_TTL_SECONDS = 600;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl;
  const eventId = url.searchParams.get('event');

  if (!eventId) {
    return NextResponse.redirect(new URL('/claim/sold-out', url));
  }

  const ttlParam = url.searchParams.get('ttl');
  const ttlSeconds = ttlParam ? Number.parseInt(ttlParam, 10) : DEFAULT_TTL_SECONDS;

  try {
    const claim = await allocateClaimCode(eventId, Number.isFinite(ttlSeconds) ? ttlSeconds : DEFAULT_TTL_SECONDS);

    if (!claim) {
      const redirectUrl = new URL('/claim/sold-out', url);
      redirectUrl.searchParams.set('event', eventId);
      return NextResponse.redirect(redirectUrl);
    }

    const redirectUrl = new URL(`/claim/${claim.code}`, url);
    redirectUrl.searchParams.set('event', eventId);
    redirectUrl.searchParams.set('source', 'dynamic');
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Dynamic claim redirect failed', error);
    const redirectUrl = new URL('/claim/sold-out', url);
    redirectUrl.searchParams.set('event', eventId);
    redirectUrl.searchParams.set('error', 'allocation');
    return NextResponse.redirect(redirectUrl);
  }
}
