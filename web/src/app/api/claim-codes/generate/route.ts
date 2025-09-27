import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

import { getServerConfig } from '@/lib/env';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { eventId, count } = await request.json();

    if (!eventId || !count || count < 1 || count > 100) {
      return NextResponse.json(
        { error: 'Invalid eventId or count (1-100)' },
        { status: 400 }
      );
    }

    const config = getServerConfig();
    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Generate claim codes
    const codes: Array<Record<string, unknown>> = [];
    for (let i = 0; i < count; i++) {
      const code = randomUUID();
      codes.push({
        eventId,
        eventid: eventId,
        code,
        status: 'unused',
      });
    }

    // Insert claim codes
    const { data: insertedCodes, error: insertError } = await supabase
      .from('claims')
      .insert(codes)
      .select('id, code, status, eventId, eventid');

    if (insertError) {
      console.error('Failed to insert claim codes:', insertError);
      return NextResponse.json(
        { error: 'Failed to generate claim codes' },
        { status: 500 }
      );
    }

    const normalizedCodes = (insertedCodes ?? []).map((row) => ({
      id: row.id,
      code: row.code,
      status: row.status,
      eventId: row.eventId ?? row.eventid,
    }));

    return NextResponse.json({
      success: true,
      codes: normalizedCodes,
      message: `Generated ${normalizedCodes.length} claim codes`,
    });
  } catch (error) {
    console.error('Claim code generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}