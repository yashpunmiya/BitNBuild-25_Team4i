import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getServerConfig } from './env';
import { parseFrameConfig, serializeFrameConfig, type FrameConfig } from './frame';

export type ClaimStatus = 'unused' | 'reserved' | 'claimed';

export type EventRow = {
  id: string;
  name: string;
  description: string;
  collectionMint: string;
  createdAt: string;
  frameTemplateUrl: string | null;
  frameConfig: FrameConfig | null;
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

export const CLAIM_EVENT_COLUMN_CANDIDATES = ['eventId', 'eventid', 'event_id'] as const;
const CLAIM_EVENT_COLUMN_LIST = [...CLAIM_EVENT_COLUMN_CANDIDATES];
const CLAIM_UPDATED_AT_COLUMN_CANDIDATES = ['updatedAt', 'updatedat', 'updated_at'] as const;
const CLAIM_UPDATED_AT_COLUMN_LIST = [...CLAIM_UPDATED_AT_COLUMN_CANDIDATES];
const CLAIM_CREATED_AT_COLUMN_CANDIDATES = ['createdAt', 'createdat', 'created_at'] as const;
const CLAIM_CREATED_AT_COLUMN_LIST = [...CLAIM_CREATED_AT_COLUMN_CANDIDATES];

const CLAIM_RESERVATION_STATUSES: ClaimStatus[] = ['unused', 'reserved'];

const EVENT_FRAME_TEMPLATE_COLUMN_CANDIDATES = [
  'frameTemplateUrl',
  'frametemplateurl',
  'frame_template_url',
] as const;

const EVENT_FRAME_TEMPLATE_COLUMN_LIST = [...EVENT_FRAME_TEMPLATE_COLUMN_CANDIDATES];
const CANONICAL_FRAME_TEMPLATE_COLUMN = 'frame_template_url';

const EVENT_FRAME_CONFIG_COLUMN_CANDIDATES = [
  'frameConfig',
  'frameconfig',
  'frame_config',
] as const;

const EVENT_FRAME_CONFIG_COLUMN_LIST = [...EVENT_FRAME_CONFIG_COLUMN_CANDIDATES];
const CANONICAL_FRAME_CONFIG_COLUMN = 'frame_config';

const mapToCanonicalFrameColumns = (columns: string[]): string[] => {
  const canonical = new Set<string>();

  for (const column of columns) {
    if (EVENT_FRAME_TEMPLATE_COLUMN_LIST.includes(column as (typeof EVENT_FRAME_TEMPLATE_COLUMN_LIST)[number])) {
      canonical.add(CANONICAL_FRAME_TEMPLATE_COLUMN);
      continue;
    }

    if (EVENT_FRAME_CONFIG_COLUMN_LIST.includes(column as (typeof EVENT_FRAME_CONFIG_COLUMN_LIST)[number])) {
      canonical.add(CANONICAL_FRAME_CONFIG_COLUMN);
      continue;
    }

    canonical.add(column);
  }

  return [...canonical];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

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
  return code === 'PGRST204' || code === '42703';
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
  frameTemplateUrl: getOptionalString(pickValue(row, EVENT_FRAME_TEMPLATE_COLUMN_LIST)),
  frameConfig: parseFrameConfig(pickValue(row, EVENT_FRAME_CONFIG_COLUMN_LIST)),
});

const normalizeClaimRow = (row: SupabaseRow): ClaimRow => ({
  id: getString(row.id),
  eventId: getString(pickValue(row, CLAIM_EVENT_COLUMN_LIST)),
  code: getString(row.code),
  status: (row.status as ClaimStatus) ?? 'unused',
  wallet: getOptionalString(pickValue(row, ['wallet'])),
  txSig: getOptionalString(pickValue(row, CLAIM_TX_SIGNATURE_COLUMNS)),
  createdAt: getString(pickValue(row, CLAIM_CREATED_AT_COLUMN_LIST)),
  updatedAt: getString(pickValue(row, CLAIM_UPDATED_AT_COLUMN_LIST)),
});

const buildClaimWithEvent = (row: SupabaseRow): ClaimWithEvent | null => {
  const eventData = row.events;
  if (!isRecord(eventData)) {
    return null;
  }

  const claim = normalizeClaimRow(row);
  return {
    ...claim,
    events: normalizeEventRow(eventData),
  };
};

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

export const insertEvent = async (
  payload: Omit<EventRow, 'id' | 'createdAt' | 'frameTemplateUrl' | 'frameConfig'>,
): Promise<EventRow> => {
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

export const getEventById = async (eventId: string): Promise<EventRow | null> => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeEventRow(data) : null;
};

class MissingFrameColumnsError extends Error {
  columns: string[];

  constructor(columns: string[]) {
    const canonicalColumns = mapToCanonicalFrameColumns(columns);
    super(
      `Missing required columns on events table for frame support: ${canonicalColumns
        .map((column) => `"${column}"`)
        .join(', ')}`,
    );
    this.name = 'MissingFrameColumnsError';
    this.columns = canonicalColumns;
  }
}

type FrameUpdateAttempt = {
  status: 'skipped' | 'updated';
  event?: EventRow;
};

const updateEventFrameForColumns = async (
  eventId: string,
  templateColumn: string | null,
  configColumn: string | null,
  updates: { templateUrl?: string | null; config?: FrameConfig | null },
): Promise<FrameUpdateAttempt> => {
  const payload: Record<string, unknown> = {};

  if (templateColumn && Object.prototype.hasOwnProperty.call(updates, 'templateUrl')) {
    payload[templateColumn] = updates.templateUrl ?? null;
  }

  if (configColumn && Object.prototype.hasOwnProperty.call(updates, 'config')) {
    payload[configColumn] = serializeFrameConfig(updates.config);
  }

  const columns = Object.keys(payload);
  if (columns.length === 0) {
    return { status: 'skipped' };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', eventId)
    .select()
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error)) {
      throw new MissingFrameColumnsError(columns);
    }
    throw error;
  }

  return { status: 'updated', event: data ? normalizeEventRow(data) : undefined };
};

export const updateEventFrame = async (
  eventId: string,
  updates: { templateUrl?: string | null; config?: FrameConfig | null },
): Promise<EventRow> => {
  const missingColumns = new Set<string>();

  for (const templateColumn of [...EVENT_FRAME_TEMPLATE_COLUMN_CANDIDATES, null]) {
    for (const configColumn of [...EVENT_FRAME_CONFIG_COLUMN_CANDIDATES, null]) {
      let attempt: FrameUpdateAttempt | undefined;
      try {
        attempt = await updateEventFrameForColumns(eventId, templateColumn, configColumn, updates);
        if (attempt.status === 'updated' && attempt.event) {
          return attempt.event;
        }
      } catch (error) {
        if (error instanceof MissingFrameColumnsError) {
          for (const column of error.columns) {
            missingColumns.add(column);
          }
          continue;
        }
        throw error;
      }
    }
  }

  if (missingColumns.size > 0) {
    throw new Error(
      `Supabase events table is missing columns required for frame support. Add columns: "frame_template_url" (text) and "frame_config" (json or text). Missing columns detected: ${
        [...missingColumns].join(', ')
      }`,
    );
  }

  const fallback = await getEventById(eventId);
  if (!fallback) {
    throw new Error('Event not found after update');
  }

  return fallback;
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

export const getClaimByTxSignature = async (
  signature: string,
): Promise<ClaimWithEvent | null> => {
  const supabase = getSupabaseAdmin();

  for (const column of CLAIM_TX_SIGNATURE_COLUMNS) {
    const { data, error } = await supabase
      .from('claims')
      .select('*, events(*)')
      .eq(column, signature)
      .maybeSingle();

    if (error) {
      if (isMissingColumnError(error)) {
        continue;
      }
      throw error;
    }

    if (data) {
      const claim = buildClaimWithEvent(data as SupabaseRow);
      if (claim) {
        return claim;
      }
    }
  }

  return null;
};

export const listClaimsByWallet = async (wallet: string): Promise<ClaimWithEvent[]> => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('claims')
    .select('*, events(*)')
    .eq('wallet', wallet)
    .eq('status', 'claimed')
    .limit(200);

  if (error) {
    if (isMissingColumnError(error)) {
      return [];
    }
    throw error;
  }

  const rows = (data as SupabaseRow[]) ?? [];
  const claims: ClaimWithEvent[] = [];

  for (const row of rows) {
    const claim = buildClaimWithEvent(row);
    if (claim) {
      claims.push(claim);
    }
  }

  return claims;
};

export const reserveClaim = async (code: string, wallet: string): Promise<ClaimRow | null> => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('claims')
    .update({ status: 'reserved', wallet })
    .eq('code', code)
    .in('status', CLAIM_RESERVATION_STATUSES)
    .is('wallet', null)
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

const releaseStaleReservationsForColumn = async (
  eventColumn: string,
  updatedColumn: string,
  eventId: string,
  cutoffIso: string,
): Promise<void> => {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('claims')
    .update({ status: 'unused', wallet: null })
    .eq(eventColumn, eventId)
    .eq('status', 'reserved')
    .lt(updatedColumn, cutoffIso);

  if (error && !isMissingColumnError(error)) {
    throw error;
  }
};

const reserveNextClaimForColumn = async (
  eventColumn: string,
  createdColumn: string,
  eventId: string,
): Promise<ClaimRow | null> => {
  const supabase = getSupabaseAdmin();
  const selectColumns = ['id', 'code', 'status', 'wallet', eventColumn, createdColumn]
    .filter(Boolean)
    .join(', ');

  const { data: candidates, error: selectError } = await supabase
    .from('claims')
    .select(selectColumns)
    .eq(eventColumn, eventId)
    .eq('status', 'unused')
    .is('wallet', null)
    .order(createdColumn, { ascending: true })
    .limit(10);

  if (selectError) {
    if (isMissingColumnError(selectError)) {
      return null;
    }
    throw selectError;
  }

  if (!candidates || candidates.length === 0) {
    return null;
  }

  const candidateRows = (candidates as unknown as SupabaseRow[]) ?? [];

  for (const candidate of candidateRows) {
    const candidateId = getString(candidate.id);

    if (!candidateId) {
      continue;
    }

    const { data: reserved, error: reserveError } = await supabase
      .from('claims')
      .update({ status: 'reserved', wallet: null })
      .eq('id', candidateId)
      .eq(eventColumn, eventId)
      .eq('status', 'unused')
      .is('wallet', null)
      .select()
      .maybeSingle();

    if (reserveError) {
      if (isMissingColumnError(reserveError)) {
        return null;
      }

      // If another request claimed this code first, try the next candidate.
      if ((reserveError as { code?: string }).code === 'PGRST116') {
        continue;
      }

      throw reserveError;
    }

    if (reserved) {
      return normalizeClaimRow(reserved);
    }
  }

  return null;
};

export const releaseStaleReservations = async (
  eventId: string,
  ttlSeconds: number,
): Promise<void> => {
  const cutoffIso = new Date(Date.now() - ttlSeconds * 1000).toISOString();

  await Promise.all(
    CLAIM_EVENT_COLUMN_LIST.flatMap((eventColumn) =>
      CLAIM_UPDATED_AT_COLUMN_LIST.map((updatedColumn) =>
        releaseStaleReservationsForColumn(eventColumn, updatedColumn, eventId, cutoffIso),
      ),
    ),
  );
};

export const allocateClaimCode = async (
  eventId: string,
  ttlSeconds: number,
): Promise<ClaimRow | null> => {
  await releaseStaleReservations(eventId, ttlSeconds);

  for (const eventColumn of CLAIM_EVENT_COLUMN_LIST) {
    for (const createdColumn of CLAIM_CREATED_AT_COLUMN_LIST) {
      const claim = await reserveNextClaimForColumn(eventColumn, createdColumn, eventId);
      if (claim) {
        return claim;
      }
    }
  }

  return null;
};

