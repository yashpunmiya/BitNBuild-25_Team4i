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

const CLAIM_TX_SIGNATURE_COLUMNS = [
  'txSig',
  'txsig',
  'tx_sig',
  'txSignature',
  'txsignature',
  'tx_signature',
];

let adminClient: SupabaseClient | undefined;

type SupabaseRow = Record<string, unknown>;

const pickValue = (row: SupabaseRow, keys: string[]): unknown => {
  for (const key of keys) {
    if (key in row) {
      return row[key];
    }
  }

  return undefined;
};

const isMissingColumnError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = (error as { code?: string }).code;
  return code === 'PGRST204';
};

const getString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  return value != null ? String(value) : '';
};

const getOptionalString = (value: unknown): string | null => {
  if (value == null) {
    return null;
  }

  const stringValue = getString(value);
  return stringValue.length > 0 ? stringValue : null;
};

const normalizeEventRow = (row: SupabaseRow): EventRow => ({
  id: getString(row.id),
  name: getString(row.name),
  description: getString(row.description),
  collectionMint: getString(pickValue(row, ['collectionMint', 'collectionmint'])),
  createdAt: getString(pickValue(row, ['createdAt', 'createdat'])),
});

const normalizeClaimRow = (row: SupabaseRow): ClaimRow => ({
  id: getString(row.id),
  eventId: getString(pickValue(row, ['eventId', 'eventid', 'event_id'])),
  code: getString(row.code),
  status: (row.status as ClaimStatus) ?? 'unused',
  wallet: getOptionalString(pickValue(row, ['wallet'])),
  txSig: getOptionalString(pickValue(row, CLAIM_TX_SIGNATURE_COLUMNS)),
  createdAt: getString(pickValue(row, ['createdAt', 'createdat'])),
  updatedAt: getString(pickValue(row, ['updatedAt', 'updatedat'])),
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
  let lastError: unknown;

  for (const column of CLAIM_TX_SIGNATURE_COLUMNS) {
    const payload: Record<string, unknown> = { status: 'claimed' };
    payload[column] = txSig;

    const { data, error } = await supabase
      .from('claims')
      .update(payload)
      .eq('code', code)
      .eq('status', 'reserved')
      .select()
      .maybeSingle();

    if (!error) {
      return data ? normalizeClaimRow(data) : null;
    }

    if (!isMissingColumnError(error)) {
      throw error;
    }

    lastError = error;
  }

  if (lastError) {
    throw lastError;
  }

  return null;
};

