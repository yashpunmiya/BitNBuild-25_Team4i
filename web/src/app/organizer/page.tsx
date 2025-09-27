'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { QRCodeSVG } from 'qrcode.react';

// Import WalletMultiButton with SSR disabled to prevent hydration mismatch
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { 
    ssr: false,
    loading: () => (
      <button 
        style={{
          background: 'linear-gradient(135deg, #22d3ee, #0ea5e9)',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          padding: '0.5rem 1rem',
          fontSize: '0.9rem',
          fontWeight: '600',
          cursor: 'not-allowed',
          opacity: 0.7,
        }}
        disabled
      >
        Loading Wallet...
      </button>
    )
  }
);

type Event = {
  id: string;
  name: string;
  description: string;
  collectionMint: string;
  createdAt: string;
};

type ClaimCode = {
  id: string;
  code: string;
  status: 'unused' | 'reserved' | 'claimed';
  eventId: string;
};

type CreateEventResponse = {
  event: Event;
  collectionMint: string;
  error?: string;
};

type GenerateCodesResponse = {
  success: boolean;
  message?: string;
  codes?: ClaimCode[];
  error?: string;
};

const containerStyle: React.CSSProperties = {
  maxWidth: '1000px',
  margin: '0 auto',
  padding: '2rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.6)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '16px',
  padding: '1.5rem',
  boxShadow: '0 18px 65px rgba(15, 23, 42, 0.45)',
};

const buttonStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #22d3ee, #0ea5e9)',
  border: 'none',
  borderRadius: '8px',
  color: 'white',
  padding: '0.75rem 1.5rem',
  fontSize: '0.9rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.8)',
  border: '1px solid rgba(148, 163, 184, 0.3)',
  borderRadius: '8px',
  color: '#e2e8f0',
  padding: '0.75rem',
  fontSize: '0.9rem',
  width: '100%',
  marginBottom: '1rem',
};

export default function OrganizerPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [claimCodes, setClaimCodes] = useState<ClaimCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>(process.env.NEXT_PUBLIC_BASE_URL ?? '');
  const [selectedQrEventId, setSelectedQrEventId] = useState('');
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  // Event creation form
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');

  // Claim code generation
  const [selectedEventId, setSelectedEventId] = useState('');
  const [numCodes, setNumCodes] = useState(10);

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !eventDescription) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: eventName,
          description: eventDescription,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.status}`);
      }

      const { event } = (await response.json()) as CreateEventResponse;

      if (!event) {
        throw new Error('Event payload missing from response');
      }

      setEvents((prev) => [...prev, event]);
      setEventName('');
      setEventDescription('');
      setSuccess(`Event "${event.name}" created with collection: ${event.collectionMint}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const generateClaimCodes = async () => {
    if (!selectedEventId || numCodes < 1) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/claim-codes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId,
          count: numCodes,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate claim codes: ${response.status}`);
      }

      const payload = (await response.json()) as GenerateCodesResponse;

      if (!payload.success || !payload.codes) {
        throw new Error(payload.error ?? 'Failed to generate claim codes');
      }

      const codes = payload.codes ?? [];
      setClaimCodes((prev) => [...prev, ...codes]);
      setSuccess(payload.message ?? `Generated ${codes.length} claim codes`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate claim codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const dynamicClaimUrl = useMemo(() => {
    if (!selectedQrEventId) {
      return '';
    }

    const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
    if (!base) {
      return `/claim/dynamic?event=${selectedQrEventId}`;
    }

    return `${base.replace(/\/$/, '')}/claim/dynamic?event=${encodeURIComponent(selectedQrEventId)}`;
  }, [origin, selectedQrEventId]);

  const copyDynamicLink = useCallback(async () => {
    if (!dynamicClaimUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(dynamicClaimUrl);
      setCopyMessage('Link copied to clipboard');
      setTimeout(() => setCopyMessage(null), 2500);
    } catch (clipboardError) {
      console.error('Failed to copy dynamic link', clipboardError);
      setCopyMessage('Unable to copy link. Copy manually.');
      setTimeout(() => setCopyMessage(null), 3000);
    }
  }, [dynamicClaimUrl]);

  return (
    <main style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Organizer Dashboard</h1>
        <p style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
          Create events, mint collection NFTs, and generate claim codes for visitors.
        </p>
        <WalletMultiButton />
      </div>

      {error && (
        <div style={{ ...cardStyle, borderColor: '#f87171', background: 'rgba(239, 68, 68, 0.1)' }}>
          <p style={{ color: '#f87171', margin: 0 }}>{error}</p>
        </div>
      )}

      {success && (
        <div style={{ ...cardStyle, borderColor: '#34d399', background: 'rgba(52, 211, 153, 0.1)' }}>
          <p style={{ color: '#34d399', margin: 0 }}>{success}</p>
        </div>
      )}

      {/* Event Creation */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Create New Event</h2>
        <form onSubmit={createEvent}>
          <input
            type="text"
            placeholder="Event Name (e.g., 'Conference 2025')"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            style={inputStyle}
            required
          />
          <textarea
            placeholder="Event Description"
            value={eventDescription}
            onChange={(e) => setEventDescription(e.target.value)}
            style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
            required
          />
          <button
            type="submit"
            style={buttonStyle}
            disabled={loading || !eventName || !eventDescription}
          >
            {loading ? 'Creating Event...' : 'Create Event & Mint Collection NFT'}
          </button>
        </form>
      </div>

      {/* Events List */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Your Events</h2>
        {events.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No events created yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {events.map((event) => (
              <div
                key={event.id}
                style={{
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '8px',
                  padding: '1rem',
                }}
              >
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{event.name}</h3>
                <p style={{ margin: '0 0 0.5rem 0', opacity: 0.8 }}>{event.description}</p>
                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>
                  Collection: {event.collectionMint}
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>
                  Created: {new Date(event.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Claim Code Generation */}
      {events.length > 0 && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Generate Claim Codes</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select an event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Number of claim codes"
              value={numCodes}
              onChange={(e) => setNumCodes(parseInt(e.target.value) || 1)}
              min="1"
              max="100"
              style={inputStyle}
            />
            <button
              onClick={generateClaimCodes}
              style={buttonStyle}
              disabled={loading || !selectedEventId}
            >
              {loading ? 'Generating...' : `Generate ${numCodes} Claim Codes`}
            </button>
          </div>
        </div>
      )}

      {/* Dynamic QR */}
      {events.length > 0 && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Dynamic Claim QR</h2>
          <p style={{ marginBottom: '1rem', opacity: 0.8 }}>
            Share a single QR code that automatically hands out the next available claim code for a selected
            event. Each scan redirects visitors to the regular claim flow with a fresh reservation.
          </p>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <select
              value={selectedQrEventId}
              onChange={(e) => setSelectedQrEventId(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select an event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
            {dynamicClaimUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <QRCodeSVG value={dynamicClaimUrl} size={220} includeMargin />
                <code style={{ fontSize: '0.85rem', opacity: 0.8 }}>{dynamicClaimUrl}</code>
                <button style={buttonStyle} onClick={copyDynamicLink}>
                  Copy Claim Link
                </button>
                {copyMessage && (
                  <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>{copyMessage}</p>
                )}
                <p style={{ fontSize: '0.8rem', opacity: 0.6, textAlign: 'center' }}>
                  Reservations auto-expire after 10 minutes if visitors abandon the flow, so the QR keeps
                  recycling codes safely.
                </p>
              </div>
            ) : (
              <p style={{ opacity: 0.7 }}>Select an event to generate the dynamic QR code.</p>
            )}
          </div>
        </div>
      )}

      {/* Claim Codes List */}
      {claimCodes.length > 0 && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Claim Codes</h2>
          <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
            {claimCodes.map((code) => (
              <div
                key={code.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                }}
              >
                <span style={{ fontFamily: 'monospace' }}>{code.code}</span>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span style={{ 
                    color: code.status === 'unused' ? '#34d399' : '#fbbf24',
                    fontSize: '0.8rem',
                  }}>
                    {code.status}
                  </span>
                  <a
                    href={`/claim/${code.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#22d3ee', textDecoration: 'none', fontSize: '0.8rem' }}
                  >
                    Test →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}