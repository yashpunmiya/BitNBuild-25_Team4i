import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

import { createCollectionNft } from '@/lib/solana';
import { insertEvent } from '@/lib/supabase';

const schema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().min(1).max(512),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = schema.parse(await request.json());
    const { collectionMint } = await createCollectionNft(payload);
    const event = await insertEvent({
      name: payload.name,
      description: payload.description,
      collectionMint,
    });

    return NextResponse.json({
      event,
      collectionMint: event.collectionMint,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: error.flatten() },
        { status: 400 },
      );
    }

    console.error('Failed to create event', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 },
    );
  }
}

