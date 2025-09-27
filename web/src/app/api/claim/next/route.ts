import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

import { allocateClaimCode } from '@/lib/supabase';

const schema = z.object({
  eventId: z.string().min(1),
  ttlSeconds: z.number().int().min(60).max(3600).optional(),
});

const DEFAULT_TTL_SECONDS = 600;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = schema.parse(await request.json());
    const ttlSeconds = payload.ttlSeconds ?? DEFAULT_TTL_SECONDS;

    const claim = await allocateClaimCode(payload.eventId, ttlSeconds);

    if (!claim) {
      return NextResponse.json(
        { error: 'No claim codes remain for this event' },
        { status: 410 },
      );
    }

    return NextResponse.json({
      code: claim.code,
      eventId: claim.eventId,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: error.flatten() },
        { status: 400 },
      );
    }

    console.error('Failed to allocate next claim', error);
    return NextResponse.json({ error: 'Failed to allocate claim code' }, { status: 500 });
  }
}
