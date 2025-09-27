import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient, type PostgrestError } from '@supabase/supabase-js';

import { getServerConfig } from '@/lib/env';
import { CLAIM_EVENT_COLUMN_CANDIDATES } from '@/lib/supabase';

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

    const baseCodes = Array.from({ length: count }, () => ({
      code: randomUUID(),
      status: 'unused' as const,
    }));

  let insertedCodes: Array<Record<string, unknown>> | null = null;
    let resolvedColumn: (typeof CLAIM_EVENT_COLUMN_CANDIDATES)[number] | null = null;
  let lastError: PostgrestError | null = null;

    for (const column of CLAIM_EVENT_COLUMN_CANDIDATES) {
      const rows = baseCodes.map(({ code, status }) => ({
        [column]: eventId,
        code,
        status,
      }));

      const { data, error } = await supabase
        .from('claims')
        .insert(rows)
        .select(['id', 'code', 'status', column].join(', '));

      if (!error && data) {
        insertedCodes = data as unknown as Array<Record<string, unknown>>;
        resolvedColumn = column;
        break;
      }

      lastError = error;

      if (!error || error?.code !== 'PGRST204') {
        console.error('Failed to insert claim codes:', error);
        return NextResponse.json(
          { error: 'Failed to generate claim codes' },
          { status: 500 }
        );
      }
    }

    if (!insertedCodes || !resolvedColumn) {
      console.error('Claims table missing event reference column', lastError);
      return NextResponse.json(
        { error: 'Claims table missing event reference column' },
        { status: 500 }
      );
    }

    const normalizedCodes = insertedCodes.map((row) => ({
      id: String(row.id ?? ''),
      code: String(row.code ?? ''),
      status: String(row.status ?? 'unused'),
      eventId: String(row[resolvedColumn] ?? eventId),
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