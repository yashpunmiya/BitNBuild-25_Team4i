import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getServerConfig } from './env';

export type ClaimStatus = 'unused' | 'reserved' | 'claimed';

export type EventRow = {
  id: string;
  name: string;
  description: string;
  collectionMint: string;
  createdAt: string;
};

export type ClaimRow = {
  id: string;
  eventId: string;
  code: string;
  status: ClaimStatus;
  wallet: string | null;
  txSig: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClaimWithEvent = ClaimRow & {
  events: EventRow;
};

let adminClient: SupabaseClient | undefined;

const normalizeEventRow = (row: Record<string, any>): EventRow => ({
  id: row.id,
  name: row.name,
  description: row.description,
  collectionMint: row.collectionMint ?? row.collectionmint,
  createdAt: row.createdAt ?? row.createdat,
});

const normalizeClaimRow = (row: Record<string, any>): ClaimRow => ({
  id: row.id,
  eventId: row.eventId ?? row.eventid,
  code: row.code,
  status: row.status as ClaimStatus,
  wallet: row.wallet ?? null,
  txSig: row.txSig ?? row.txsig ?? null,
  createdAt: row.createdAt ?? row.createdat,
  updatedAt: row.updatedAt ?? row.updatedat,
});

const getSupabaseAdmin = (): SupabaseClient => {
  if (!adminClient) {
    const config = getServerConfig();
    adminClient = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
};

export const insertEvent = async (payload: Omit<EventRow, 'id' | 'createdAt'>): Promise<EventRow> => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('events')
    .insert({
      name: payload.name,
      description: payload.description,
      collectionMint: payload.collectionMint,
      collectionmint: payload.collectionMint,
    })
    .select()
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to insert event');
  }

  return normalizeEventRow(data);
};

export const getClaimByCode = async (code: string): Promise<ClaimWithEvent | null> => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('claims')
    .select('*, events(*)')
    .eq('code', code)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  if (!data.events) {
    return null;
  }

  const claim = normalizeClaimRow(data);

  return {
    ...claim,
    events: normalizeEventRow(data.events),
  };
};

export const reserveClaim = async (code: string, wallet: string): Promise<ClaimRow | null> => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('claims')
    .update({ status: 'reserved', wallet })
    .eq('code', code)
    .eq('status', 'unused')
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeClaimRow(data) : null;
};

export const markClaimFailed = async (code: string): Promise<void> => {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('claims')
    .update({ status: 'unused', wallet: null })
    .eq('code', code)
    .eq('status', 'reserved');

  if (error) {
    throw error;
  }
};

export const finalizeClaim = async (code: string, txSig: string): Promise<ClaimRow | null> => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('claims')
    .update({ status: 'claimed', txSig })
    .eq('code', code)
    .eq('status', 'reserved')
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeClaimRow(data) : null;
};

