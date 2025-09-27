import { Buffer } from 'buffer';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

import { uploadImage, uploadMetadata } from '@/lib/storage';
import { getClaimByCode } from '@/lib/supabase';

const schema = z.object({
  code: z.string().min(1),
  imageDataUrl: z.string().regex(/^data:image\/(png|jpeg);base64,/),
});

const parseDataUrl = (dataUrl: string): { contentType: string; buffer: Buffer } => {
  const [header, data] = dataUrl.split(',', 2);
  const contentType = header.slice(5, header.indexOf(';'));
  const buffer = Buffer.from(data, 'base64');

  return { contentType, buffer };
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = schema.parse(await request.json());
    const claim = await getClaimByCode(payload.code);

    if (!claim || !claim.events) {
      return NextResponse.json({ error: 'Claim code not found' }, { status: 404 });
    }

    const { contentType, buffer } = parseDataUrl(payload.imageDataUrl);

    const imageUri = await uploadImage(buffer, contentType, `${payload.code}.png`);

    const metadataUri = await uploadMetadata(
      {
        name: `${claim.events.name} Proof of Presence`,
        symbol: 'POP',
        description: claim.events.description,
        image: imageUri,
        attributes: [
          { trait_type: 'Event', value: claim.events.name },
          { trait_type: 'Code', value: claim.code },
        ],
        properties: {
          files: [
            {
              uri: imageUri,
              type: contentType,
            },
          ],
          category: 'image',
        },
      },
      `${payload.code}.json`,
    );

    return NextResponse.json({ metadataUri, imageUri });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: error.flatten() },
        { status: 400 },
      );
    }

    console.error('Failed to create metadata', error);
    return NextResponse.json({ error: 'Failed to create metadata' }, { status: 500 });
  }
}
