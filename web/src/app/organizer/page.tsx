'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';

import styles from './organizer.module.css';
import type { FrameConfig } from '@/lib/frame';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  {
    ssr: false,
    loading: () => (
      <button className={`${styles.actionButton} ${styles.primaryButton}`} disabled>
        Loading wallet…
      </button>
    ),
  },
);

type Event = {
  id: string;
  name: string;
  description: string;
  collectionMint: string;
  createdAt: string;
  frameTemplateUrl: string | null;
  frameConfig: FrameConfig | null;
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

type FeePayerBalance = {
  lamports: number;
  sol: number;
};

const FALLBACK_FEE_PAYER_ADDRESS = '4Eoeq4SPSevhrGokGiVdpvooDZ474GX4gTmAis5YUqWC';

export default function OrganizerPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [claimCodes, setClaimCodes] = useState<ClaimCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>(process.env.NEXT_PUBLIC_BASE_URL ?? '');
  const [selectedQrEventId, setSelectedQrEventId] = useState('');
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const [feePayerAddress, setFeePayerAddress] = useState<string>(FALLBACK_FEE_PAYER_ADDRESS);
  const [feePayerBalance, setFeePayerBalance] = useState<FeePayerBalance | null>(null);
  const [feePayerLoading, setFeePayerLoading] = useState(false);
  const [funding, setFunding] = useState(false);
  const [fundingMessage, setFundingMessage] = useState<string | null>(null);
  const [fundingError, setFundingError] = useState<string | null>(null);
  const [copyAddressMessage, setCopyAddressMessage] = useState<string | null>(null);

  const [selectedFrameEventId, setSelectedFrameEventId] = useState('');
  const [frameConfigInputs, setFrameConfigInputs] = useState({
    x: 207,
    y: 233,
    width: 301,
    height: 301,
    borderRadius: 0,
  });
  const [frameUploadPreview, setFrameUploadPreview] = useState<string | null>(null);
  const [frameTemplatePreview, setFrameTemplatePreview] = useState<string | null>(null);
  const [frameLoading, setFrameLoading] = useState(false);
  const [frameError, setFrameError] = useState<string | null>(null);
  const [frameMessage, setFrameMessage] = useState<string | null>(null);
  const frameImageRef = useRef<HTMLImageElement | null>(null);
  const [framePreviewNaturalSize, setFramePreviewNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [framePreviewDisplaySize, setFramePreviewDisplaySize] = useState<{ width: number; height: number } | null>(null);

  const selectedFrameEvent = useMemo(
    () => events.find((event) => event.id === selectedFrameEventId) ?? null,
    [events, selectedFrameEventId],
  );

  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');

  const [selectedEventId, setSelectedEventId] = useState('');
  const [numCodes, setNumCodes] = useState(10);

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !eventDescription) {
      return;
    }

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
    if (!selectedEventId || numCodes < 1) {
      return;
    }

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

  const formatSol = useCallback((value: number) => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
  }, []);

  const shortenValue = useCallback((value: string, visible = 4) => {
    if (!value) {
      return '';
    }

    return value.length <= visible * 2 ? value : `${value.slice(0, visible)}…${value.slice(-visible)}`;
  }, []);

  const fetchFeePayerBalance = useCallback(async () => {
    setFeePayerLoading(true);
    setFundingError(null);
    try {
      const response = await fetch('/api/wallet/fee-payer/balance', {
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to fetch fee payer balance');
      }

      if (payload?.address) {
        setFeePayerAddress(String(payload.address));
      }

      if (typeof payload?.lamports === 'number' && typeof payload?.sol === 'number') {
        setFeePayerBalance({
          lamports: payload.lamports,
          sol: payload.sol,
        });
      } else {
        setFeePayerBalance(null);
      }
    } catch (err) {
      setFeePayerBalance(null);
      setFundingError(err instanceof Error ? err.message : 'Failed to fetch fee payer balance');
    } finally {
      setFeePayerLoading(false);
    }
  }, []);

  const handleCopyFeePayerAddress = useCallback(async () => {
    if (!feePayerAddress) {
      return;
    }

    try {
      await navigator.clipboard.writeText(feePayerAddress);
      setCopyAddressMessage('Address copied');
    } catch (copyError) {
      console.error('Failed to copy fee payer address', copyError);
      setCopyAddressMessage('Copy failed. Use manual copy.');
    }

    setTimeout(() => setCopyAddressMessage(null), 2500);
  }, [feePayerAddress]);

  const handleRequestAirdrop = useCallback(async () => {
    setFunding(true);
    setFundingError(null);
    setFundingMessage(null);

    try {
      const response = await fetch('/api/wallet/fee-payer/airdrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 1 }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to request devnet airdrop');
      }

      const solAmount = typeof payload?.sol === 'number' ? formatSol(payload.sol) : '1';
      const signature = typeof payload?.signature === 'string' ? payload.signature : '';

      setFundingMessage(
        `Devnet airdrop requested: ${solAmount} SOL${
          signature ? ` (signature ${shortenValue(signature, 6)})` : ''
        }`,
      );

      await fetchFeePayerBalance();
    } catch (airdropError) {
      setFundingError(
        airdropError instanceof Error ? airdropError.message : 'Unable to request devnet airdrop',
      );
    } finally {
      setFunding(false);
    }
  }, [fetchFeePayerBalance, formatSol, shortenValue]);

  const handleFrameInputChange = useCallback(
    (field: keyof typeof frameConfigInputs, value: number) => {
      setFrameConfigInputs((prev) => ({
        ...prev,
        [field]: Number.isFinite(value) ? value : prev[field],
      }));
    },
    [],
  );

  const handleFrameFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setFrameUploadPreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setFrameUploadPreview(result);
        setFrameTemplatePreview(result);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFrameSubmit = useCallback(async () => {
    if (!selectedFrameEventId) {
      setFrameError('Select an event first.');
      return;
    }

    setFrameLoading(true);
    setFrameError(null);
    setFrameMessage(null);

    try {
      const payload: Record<string, unknown> = {
        eventId: selectedFrameEventId,
        frameConfig: {
          selfie: {
            x: frameConfigInputs.x,
            y: frameConfigInputs.y,
            width: frameConfigInputs.width,
            height: frameConfigInputs.height,
            borderRadius: frameConfigInputs.borderRadius,
          },
        },
      };

      if (frameUploadPreview) {
        payload.frameDataUrl = frameUploadPreview;
      }

      const response = await fetch('/api/events/frame/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to update frame');
      }

      const updatedEvent = data?.event as Event | undefined;
      if (updatedEvent) {
        setEvents((prev) =>
          prev.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)),
        );
        setFrameTemplatePreview(updatedEvent.frameTemplateUrl ?? frameUploadPreview ?? null);
        setFrameUploadPreview(null);
      }

      setFrameMessage('Frame template saved. New claims will use the updated layout.');
    } catch (frameUpdateError) {
      setFrameError(
        frameUpdateError instanceof Error
          ? frameUpdateError.message
          : 'Failed to update frame template',
      );
    } finally {
      setFrameLoading(false);
    }
  }, [frameConfigInputs, frameUploadPreview, selectedFrameEventId]);

  const handleFrameImageLoaded = useCallback((target: HTMLImageElement) => {
    frameImageRef.current = target;
    setFramePreviewNaturalSize({ width: target.naturalWidth, height: target.naturalHeight });
    const rect = target.getBoundingClientRect();
    setFramePreviewDisplaySize({ width: rect.width, height: rect.height });
  }, []);

  useEffect(() => {
    const updateDisplaySize = () => {
      if (frameImageRef.current) {
        const rect = frameImageRef.current.getBoundingClientRect();
        setFramePreviewDisplaySize({ width: rect.width, height: rect.height });
      }
    };

    window.addEventListener('resize', updateDisplaySize);
    updateDisplaySize();

    return () => {
      window.removeEventListener('resize', updateDisplaySize);
    };
  }, [frameTemplatePreview]);

  const frameOverlayStyle = useMemo(() => {
    if (!framePreviewNaturalSize || !framePreviewDisplaySize) {
      return null;
    }

    const scaleX = framePreviewDisplaySize.width / framePreviewNaturalSize.width;
    const scaleY = framePreviewDisplaySize.height / framePreviewNaturalSize.height;

    return {
      position: 'absolute' as const,
      left: frameConfigInputs.x * scaleX,
      top: frameConfigInputs.y * scaleY,
      width: frameConfigInputs.width * scaleX,
      height: frameConfigInputs.height * scaleY,
      borderRadius: frameConfigInputs.borderRadius * Math.min(scaleX, scaleY),
      border: '2px dashed rgba(56,189,248,0.85)',
      boxShadow: '0 0 0 1px rgba(14,165,233,0.4)',
      pointerEvents: 'none' as const,
    };
  }, [frameConfigInputs, framePreviewDisplaySize, framePreviewNaturalSize]);

  useEffect(() => {
    void fetchFeePayerBalance();
  }, [fetchFeePayerBalance]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!selectedFrameEvent) {
      setFrameTemplatePreview(null);
      setFrameUploadPreview(null);
      setFrameConfigInputs((prev) => ({ ...prev, x: 207, y: 233, width: 301, height: 301 }));
      setFramePreviewNaturalSize(null);
      setFramePreviewDisplaySize(null);
      setFrameError(null);
      setFrameMessage(null);
      return;
    }

    setFrameTemplatePreview(selectedFrameEvent.frameTemplateUrl ?? null);
    setFrameUploadPreview(null);
    setFramePreviewNaturalSize(null);
    setFramePreviewDisplaySize(null);
    setFrameError(null);
    setFrameMessage(null);

    if (selectedFrameEvent.frameConfig?.selfie) {
      const { x, y, width, height, borderRadius } = selectedFrameEvent.frameConfig.selfie;
      setFrameConfigInputs({
        x,
        y,
        width,
        height,
        borderRadius: borderRadius ?? 0,
      });
    }
  }, [selectedFrameEvent]);

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

  const getStatusClass = useCallback((status: ClaimCode['status']) => {
    if (status === 'unused') return styles.statusUnused;
    if (status === 'reserved') return styles.statusReserved;
    return styles.statusClaimed;
  }, []);

  const totalCodes = claimCodes.length;

  const feePayerBalanceDisplay = feePayerLoading
    ? 'Loading…'
    : feePayerBalance
      ? `${formatSol(feePayerBalance.sol)} SOL`
      : 'Unavailable';

  return (
    <main className="app-shell">
      <div className={styles.dashboard}>
        <aside className={`${styles.sidebar} ${styles.tile}`}>
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarBrand}>
              <span className={styles.sidebarIcon} aria-hidden="true">
                🎟️
              </span>
              <div>
                
                <p className={styles.sidebarTitle}>Event Console</p>
              </div>
            </div>
            
          </div>

          <div className={styles.sidebarActions}>
            <WalletMultiButton />
            <button
              className={`${styles.actionButton} ${styles.secondaryButton}`}
              type="button"
              onClick={handleCopyFeePayerAddress}
            >
              Copy fee payer address
            </button>
            
            {copyAddressMessage && <span className={styles.subtleNote}>{copyAddressMessage}</span>}
            {fundingMessage && <span className={styles.subtleNote}>{fundingMessage}</span>}
            {fundingError && <span className={styles.errorNote}>{fundingError}</span>}
          </div>

          <div className={styles.sidebarStats}>
            <div className={styles.sidebarStat}>
              <span className={styles.sidebarStatLabel}>Events live</span>
              <span className={styles.sidebarStatValue}>{events.length}</span>
            </div>
            <div className={styles.sidebarStat}>
              <span className={styles.sidebarStatLabel}>Codes issued</span>
              <span className={styles.sidebarStatValue}>{totalCodes}</span>
            </div>
            <div className={styles.sidebarStat}>
              <span className={styles.sidebarStatLabel}>Fee payer</span>
              <span className={styles.sidebarStatValue}>{feePayerBalanceDisplay}</span>
            </div>
          </div>

          <div className={styles.sidebarFooter}>
            <span>Fee payer wallet</span>
            <code className={styles.sidebarAddress}>{feePayerAddress}</code>
            {feePayerBalance && (
              <span>{feePayerBalance.lamports.toLocaleString()} lamports available</span>
            )}
          </div>
        </aside>

        <section id="event-hub" className={`${styles.compactCard} surface-card`}>
          <div className={styles.compactHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Create & Track Events</h2>
              <p className={styles.sectionSubtitle}>
                Launch collections and review everything minted so far in one glance.
              </p>
            </div>
            {(error || success) && (
              <div className={styles.compactFeedback}>
                {error && <div className="ui-alert ui-alert--critical">{error}</div>}
                {success && !error && <div className="ui-alert">{success}</div>}
              </div>
            )}
          </div>

          <div className={styles.compactBody}>
            <form onSubmit={createEvent} className={styles.compactForm}>
              <div className={styles.compactFormGrid}>
                <label className="ui-label" htmlFor="event-name-compact">
                  Event name
                  <input
                    id="event-name-compact"
                    type="text"
                    placeholder="Event Name"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="ui-input"
                    required
                  />
                </label>
                <label className="ui-label" htmlFor="event-description-compact">
                  Event description
                  <textarea
                    id="event-description-compact"
                    placeholder="Event Description"
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    className="ui-textarea"
                    rows={3}
                    required
                  />
                </label>
              </div>
              <div className={styles.compactActions}>
                <button
                  type="submit"
                  className={`${styles.actionButton} ${styles.primaryButton}`}
                  disabled={loading || !eventName || !eventDescription}
                >
                  {loading ? 'Creating event…' : 'Create event'}
                </button>
              </div>
            </form>

            <div className={styles.compactList}>
              <div className={styles.listHeading}>
                <span className={styles.listLabel}>Recent events</span>
                {events.length > 0 && <span className={styles.listCount}>{events.length}</span>}
              </div>
              {events.length === 0 ? (
                <p className={styles.subtleNote}>No events yet—mint the first one above.</p>
              ) : (
                <ul className={styles.eventList}>
                  {events.map((event) => (
                    <li key={event.id} className={styles.eventListItem}>
                      <div>
                        <p className={styles.eventListTitle}>{event.name}</p>
                        <p className={styles.eventListMeta}>
                          {new Date(event.createdAt).toLocaleDateString()} • Collection{' '}
                          {shortenValue(event.collectionMint, 6)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section id="code-hub" className={`${styles.compactCard} surface-card surface-card--accent`}>
          <div className={styles.compactHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Claim Codes</h2>
              <p className={styles.sectionSubtitle}>
                Review live codes and spin up fresh batches without leaving this card.
              </p>
            </div>
          </div>

          <div className={styles.compactBody}>
            <div className={`${styles.compactList} ${styles.codeListCompact}`}>
              <div className={styles.listHeading}>
                <span className={styles.listLabel}>Live inventory</span>
                {claimCodes.length > 0 && <span className={styles.listCount}>{claimCodes.length}</span>}
              </div>
              {claimCodes.length === 0 ? (
                <p className={styles.subtleNote}>No codes yet—generate a batch below.</p>
              ) : (
                <ul className={styles.codeListCompactItems}>
                  {claimCodes.map((code) => (
                    <li key={code.id} className={styles.codeListItem}>
                      <span className={styles.codeValue}>{code.code}</span>
                      <div className={styles.codeActions}>
                        <span className={`${styles.codeStatus} ${getStatusClass(code.status)}`}>{code.status}</span>
                        <a
                          href={`/claim/${code.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.codeLink}
                        >
                          Test →
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form className={styles.compactForm}>
              <div className={styles.compactFormGrid}>
                <label className="ui-label" htmlFor="code-event-select">
                  Event
                  <select
                    id="code-event-select"
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="ui-input"
                  >
                    <option value="">Select an event</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ui-label" htmlFor="code-count-input">
                  Quantity
                  <input
                    id="code-count-input"
                    type="number"
                    placeholder="Number of codes"
                    value={numCodes}
                    onChange={(e) => setNumCodes(Number.parseInt(e.target.value, 10) || 1)}
                    min="1"
                    max="100"
                    className="ui-input"
                  />
                </label>
              </div>
              <div className={styles.compactActions}>
                <button
                  onClick={generateClaimCodes}
                  className={`${styles.actionButton} ${styles.primaryButton}`}
                  disabled={loading || !selectedEventId}
                  type="button"
                >
                  {loading ? 'Generating…' : `Generate ${numCodes} codes`}
                </button>
              </div>
            </form>
          </div>
        </section>

  <section id="dynamic-qr" className={`${styles.panelCard} ${styles.dynamicQRCard} surface-card`}>
          <div className={styles.sectionIntro}>
            <h2 className={styles.sectionTitle}>Dynamic Claim QR</h2>
            <p className={styles.sectionSubtitle}>
              Share a single QR code that automatically hands out the next available claim code for a selected event.
            </p>
          </div>
          <div className={styles.qrPanel}>
            <select
              value={selectedQrEventId}
              onChange={(e) => setSelectedQrEventId(e.target.value)}
              className="ui-input"
            >
              <option value="">Select an event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
            {dynamicClaimUrl ? (
              <>
                <div className={styles.qrCanvas}>
                  <QRCodeSVG value={dynamicClaimUrl} size={220} includeMargin />
                </div>
                <p className={styles.qrLink}>{dynamicClaimUrl}</p>
                <button
                  className={`${styles.actionButton} ${styles.secondaryButton}`}
                  onClick={copyDynamicLink}
                  type="button"
                >
                  Copy claim link
                </button>
                {copyMessage && <p className={styles.subtleNote}>{copyMessage}</p>}
                <p className={styles.subtleNote}>
                  Reservations auto-expire after 10 minutes if visitors abandon the flow, so the QR keeps recycling
                  codes safely.
                </p>
              </>
            ) : (
              <p className={styles.subtleNote}>Select an event to generate the dynamic QR code.</p>
            )}
          </div>
        </section>

  <section id="frame-template" className={`${styles.frameSpan} ${styles.frameTemplateWide} surface-card surface-card--accent`}>
          <div className={styles.sectionIntro}>
            <h2 className={styles.sectionTitle}>Event Frame Template</h2>
            <p className={styles.sectionSubtitle}>
              Upload a base frame artwork and describe where the visitor selfie should be placed. During minting we’ll
              composite their photo onto this template, turning each NFT into a branded badge.
            </p>
          </div>
          <div className={styles.frameEditor}>
            <select
              value={selectedFrameEventId}
              onChange={(event) => setSelectedFrameEventId(event.target.value)}
              className="ui-input"
            >
              <option value="">Select an event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>

            {selectedFrameEventId ? (
              <div className={styles.frameContent}>
                <div className={styles.frameConfigColumn}>
                  <div className={styles.formGrid}>
                    <label className="ui-label" htmlFor="frame-upload-input">
                      Frame artwork (.png or .jpg)
                      <input
                        id="frame-upload-input"
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={handleFrameFileChange}
                        className="ui-input"
                      />
                    </label>
                    <p className={styles.subtleNote}>
                      Tip: match these coordinates to the template’s pixel dimensions for precise placement.
                    </p>
                  </div>

                  <div className={styles.formGridColumns}>
                    {([
                      ['x', 'Selfie X (px)'],
                      ['y', 'Selfie Y (px)'],
                      ['width', 'Selfie Width (px)'],
                      ['height', 'Selfie Height (px)'],
                      ['borderRadius', 'Corner Radius (px)'],
                    ] as const).map(([field, label]) => (
                      <label key={field} className="ui-label" htmlFor={`frame-${field}`}>
                        {label}
                        <input
                          id={`frame-${field}`}
                          type="number"
                          value={frameConfigInputs[field]}
                          onChange={(event) =>
                            handleFrameInputChange(field, Number.parseFloat(event.target.value))
                          }
                          className="ui-input"
                        />
                      </label>
                    ))}
                  </div>

                  <div className={styles.actionRow}>
                    <button
                      type="button"
                      className={`${styles.actionButton} ${styles.primaryButton}`}
                      onClick={() => {
                        void handleFrameSubmit();
                      }}
                      disabled={frameLoading}
                    >
                      {frameLoading ? 'Saving frame…' : 'Save frame template'}
                    </button>
                    <button
                      type="button"
                      className={`${styles.actionButton} ${styles.ghostButton}`}
                      onClick={() => {
                        setFrameUploadPreview(null);
                        setFrameTemplatePreview(selectedFrameEvent?.frameTemplateUrl ?? null);
                      }}
                      disabled={frameLoading}
                    >
                      Reset upload
                    </button>
                  </div>

                  {frameError && <div className="ui-alert ui-alert--critical">{frameError}</div>}
                  {frameMessage && <div className="ui-alert">{frameMessage}</div>}
                </div>

                <div className={styles.framePreviewColumn}>
                  <div className={styles.framePreview}>
                    <p className={styles.subtleNote}>Live preview</p>
                    <div className={styles.framePreviewCanvas}>
                      {frameTemplatePreview ? (
                        <>
                          <Image
                            ref={frameImageRef}
                            src={frameTemplatePreview}
                            alt="Frame template preview"
                            width={framePreviewNaturalSize?.width ?? 1200}
                            height={framePreviewNaturalSize?.height ?? 1200}
                            className={styles.frameImage}
                            onLoadingComplete={handleFrameImageLoaded}
                            unoptimized
                          />
                          {frameOverlayStyle && <div style={frameOverlayStyle} />}
                        </>
                      ) : (
                        <div className={styles.framePlaceholder}>
                          Upload a frame artwork to preview it here.
                        </div>
                      )}
                    </div>
                  </div>
                  <p className={styles.subtleNote}>
                    The dotted rectangle shows where the visitor photo will land after resizing.
                  </p>
                </div>
              </div>
            ) : (
              <p className={styles.subtleNote}>Select an event to configure its frame template.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}