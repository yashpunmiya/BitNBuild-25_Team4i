import { Buffer } from 'buffer';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { ZodError, z } from 'zod';

import { uploadImage, uploadMetadata } from '@/lib/storage';
import { getClaimByCode } from '@/lib/supabase';
import { getClaimNftName } from '@/lib/nft';
import type { FrameConfig } from '@/lib/frame';

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

const buildSelfieWithFrame = async (
  selfieBuffer: Buffer,
  frameTemplateUrl: string | null,
  frameConfig: FrameConfig | null,
): Promise<{ buffer: Buffer; contentType: string }> => {
  if (!frameTemplateUrl || !frameConfig?.selfie) {
    return { buffer: selfieBuffer, contentType: 'image/png' };
  }

  try {
    const templateResponse = await fetch(frameTemplateUrl);
    if (!templateResponse.ok) {
      throw new Error(`Template fetch failed with status ${templateResponse.status}`);
    }

    const templateArrayBuffer = await templateResponse.arrayBuffer();
    const templateBuffer = Buffer.from(templateArrayBuffer);

    const { x, y, width, height, borderRadius } = frameConfig.selfie;
    const resizedSelfie = await sharp(selfieBuffer)
      .resize(Math.round(width), Math.round(height), { fit: 'cover' })
      .ensureAlpha()
      .toBuffer();

    let processedSelfie = resizedSelfie;

    if (borderRadius && borderRadius > 0) {
      const radius = Math.min(borderRadius, Math.min(width, height) / 2);
      const svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" /></svg>`;
      processedSelfie = await sharp(resizedSelfie)
        .composite([{ input: Buffer.from(svg), blend: 'dest-in' }])
        .png()
        .toBuffer();
    }

    const composed = await sharp(templateBuffer)
      .composite([
        {
          input: processedSelfie,
          top: Math.round(y),
          left: Math.round(x),
        },
      ])
      .png()
      .toBuffer();

    return { buffer: composed, contentType: 'image/png' };
  } catch (error) {
    console.error('Failed to compose frame template', error);
    // Fallback to original selfie if composition fails
    return { buffer: selfieBuffer, contentType: 'image/png' };
  }
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = schema.parse(await request.json());
    const claim = await getClaimByCode(payload.code);

    if (!claim || !claim.events) {
      return NextResponse.json({ error: 'Claim code not found' }, { status: 404 });
    }

    const { buffer } = parseDataUrl(payload.imageDataUrl);

    const { buffer: framedBuffer, contentType } = await buildSelfieWithFrame(
      buffer,
      claim.events.frameTemplateUrl,
      claim.events.frameConfig,
    );

    const imageUri = await uploadImage(framedBuffer, contentType, `${payload.code}.png`);

    const nftName = getClaimNftName(claim.events.name);
    const trimmedDescription = (claim.events.description ?? '').trim();
    const description =
      trimmedDescription.length > 0
        ? trimmedDescription
        : `Proof of Presence for ${claim.events.name}`;

    const metadataUri = await uploadMetadata(
      {
        name: nftName,
        symbol: 'POP',
        description,
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
        external_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/claim/${payload.code}`,
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
