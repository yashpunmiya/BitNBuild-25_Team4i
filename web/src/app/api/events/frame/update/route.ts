import { Buffer } from 'buffer';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

import { uploadImage } from '@/lib/storage';
import { getEventById, updateEventFrame } from '@/lib/supabase';
import type { FrameConfig } from '@/lib/frame';

const frameSchema = z.object({
  eventId: z.string().min(1),
  frameDataUrl: z.string().regex(/^data:image\/(png|jpeg);base64,/).optional(),
  frameConfig: z
    .object({
      selfie: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number().positive(),
        height: z.number().positive(),
        borderRadius: z.number().min(0).optional(),
      }),
    })
    .optional(),
});

const parseDataUrl = (dataUrl: string): { contentType: string; buffer: Buffer } => {
  const [header, data] = dataUrl.split(',', 2);
  const contentType = header.slice(5, header.indexOf(';'));
  const buffer = Buffer.from(data, 'base64');

  return { contentType, buffer };
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = frameSchema.parse(await request.json());
    const existing = await getEventById(payload.eventId);

    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    let frameTemplateUrl: string | undefined;

    if (payload.frameDataUrl) {
      const { buffer, contentType } = parseDataUrl(payload.frameDataUrl);
      const extension = contentType === 'image/png' ? 'png' : 'jpg';
      const fileName = `frames/${payload.eventId}-${Date.now()}.${extension}`;
      frameTemplateUrl = await uploadImage(buffer, contentType, fileName);
    }

    const updated = await updateEventFrame(payload.eventId, {
      templateUrl: frameTemplateUrl ?? existing.frameTemplateUrl ?? null,
      config: (payload.frameConfig as FrameConfig | undefined) ?? existing.frameConfig,
    });

    return NextResponse.json({
      event: updated,
      templateUrl: updated.frameTemplateUrl,
      frameConfig: updated.frameConfig,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid frame payload', details: error.flatten() },
        { status: 400 },
      );
    }

    console.error('Failed to update event frame', error);
    return NextResponse.json({ error: 'Failed to update frame' }, { status: 500 });
  }
}
