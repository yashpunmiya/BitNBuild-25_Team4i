'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEventHandler,
  type ReactElement,
} from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  minHeight: '100vh',
  padding: '3rem 1.5rem',
  gap: '2rem',
};

const cardStyle: CSSProperties = {
  width: '100%',
  maxWidth: '900px',
  background: 'rgba(15, 23, 42, 0.65)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  borderRadius: '16px',
  padding: '2.25rem',
  boxShadow: '0 18px 65px rgba(15, 23, 42, 0.45)',
  color: '#e2e8f0',
};

const inputRowStyle: CSSProperties = {
  display: 'grid',
  gap: '1.5rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  marginBottom: '1.5rem',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '0.9rem 1rem',
  borderRadius: '12px',
  border: '1px solid rgba(148, 163, 184, 0.35)',
  background: 'rgba(15, 23, 42, 0.85)',
  color: '#e2e8f0',
  fontSize: '0.95rem',
};

const labelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const submitButtonStyle: CSSProperties = {
  background: 'linear-gradient(135deg, #22d3ee, #0ea5e9)',
  border: 'none',
  borderRadius: '12px',
  color: 'white',
  padding: '0.9rem 1.5rem',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  transition: 'all 0.2s',
};

const secondaryLinkStyle: CSSProperties = {
  color: '#22d3ee',
  textDecoration: 'underline',
};

const statusPillStyle = (minted: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  background: minted ? 'rgba(34, 197, 94, 0.2)' : 'rgba(226, 232, 240, 0.1)',
  border: minted ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid rgba(148, 163, 184, 0.2)',
  color: minted ? '#bbf7d0' : '#e2e8f0',
  padding: '0.35rem 0.9rem',
  borderRadius: '9999px',
  fontSize: '0.85rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
});

const shorten = (value: string | null | undefined, visible = 4): string | null => {
  if (!value) {
    return null;
  }
  return value.length <= visible * 2
    ? value
    : `${value.slice(0, visible)}…${value.slice(-visible)}`;
};

type VerificationMatch = {
  id: string;
  code: string;
  status: 'unused' | 'reserved' | 'claimed';
  minted: boolean;
  wallet: string | null;
  txSignature: string | null;
  createdAt: string;
  updatedAt: string;
  event: {
    id: string;
    name: string;
    description: string;
    collectionMint: string;
  };
  sources: string[];
};

type VerificationResponse = {
  matches: VerificationMatch[];
  warnings?: string[];
  error?: string;
};

export default function VerifyPage(): ReactElement {
  const searchParams = useSearchParams();

  const [claimCode, setClaimCode] = useState(
    () => searchParams.get('code') ?? searchParams.get('claim') ?? '',
  );
  const [wallet, setWallet] = useState(() => searchParams.get('wallet') ?? '');
  const [txSignature, setTxSignature] = useState(
    () => searchParams.get('tx') ?? searchParams.get('signature') ?? '',
  );
  const [results, setResults] = useState<VerificationMatch[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = useMemo(() => {
    return [claimCode, wallet, txSignature].some((value) => value.trim().length > 0);
  }, [claimCode, wallet, txSignature]);

  const buildPayload = useCallback((): Record<string, string> => {
    const payload: Record<string, string> = {};
    if (claimCode.trim()) {
      payload.claimCode = claimCode.trim();
    }
    if (wallet.trim()) {
      payload.wallet = wallet.trim();
    }
    if (txSignature.trim()) {
      payload.txSignature = txSignature.trim();
    }
    return payload;
  }, [claimCode, wallet, txSignature]);

  const runVerification = useCallback(
    async (payload: Record<string, string>) => {
      if (Object.keys(payload).length === 0) {
        setResults([]);
        setWarnings([]);
        setError('Enter at least one lookup value to verify an NFT.');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = (await response.json()) as VerificationResponse;

        if (!response.ok) {
          setError(data?.error ?? 'Verification failed.');
          setResults([]);
          setWarnings([]);
          return;
        }

        setResults(data.matches ?? []);
        setWarnings(data.warnings ?? []);
      } catch (requestError) {
        console.error('Verification request failed', requestError);
        setError('Unable to reach verification service. Try again shortly.');
        setResults([]);
        setWarnings([]);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const autoRunRef = useRef(false);

  useEffect(() => {
    if (autoRunRef.current) {
      return;
    }

    if (!canSubmit) {
      return;
    }

    const payload = buildPayload();
    if (Object.keys(payload).length === 0) {
      return;
    }

    autoRunRef.current = true;
    setSubmitted(true);
    void runVerification(payload);
  }, [buildPayload, canSubmit, runVerification]);

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setSubmitted(true);

    if (!canSubmit) {
      setError('Enter at least one lookup value to verify an NFT.');
      setResults([]);
      setWarnings([]);
      return;
    }

    const payload = buildPayload();
    await runVerification(payload);
  };

  return (
    <main style={containerStyle}>
      <div style={cardStyle}>
        <header style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>
            Proof of Presence • Verification
          </p>
          <h1 style={{ fontSize: '2.25rem', marginTop: '0.4rem', marginBottom: '0.75rem' }}>
            Verify a Minted Proof
          </h1>
          <p style={{ lineHeight: 1.6, opacity: 0.8 }}>
            Confirm a visitor&apos;s Proof of Presence NFT by entering the claim code, the minted wallet
            address, or the transaction signature. The verifier queries organizer records to ensure the
            NFT was minted under the correct collection.
          </p>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={inputRowStyle}>
            <label style={labelStyle}>
              <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.75 }}>
                Claim Code
              </span>
              <input
                style={inputStyle}
                placeholder="e.g. POP-1234 or demo-code"
                value={claimCode}
                onChange={(event) => setClaimCode(event.target.value)}
                autoComplete="off"
              />
            </label>
            <label style={labelStyle}>
              <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.75 }}>
                Wallet Address
              </span>
              <input
                style={inputStyle}
                placeholder="Solana wallet that received the proof"
                value={wallet}
                onChange={(event) => setWallet(event.target.value)}
                autoComplete="off"
              />
            </label>
            <label style={labelStyle}>
              <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.75 }}>
                Transaction Signature
              </span>
              <input
                style={inputStyle}
                placeholder="Solana transaction signature"
                value={txSignature}
                onChange={(event) => setTxSignature(event.target.value)}
                autoComplete="off"
              />
            </label>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <button type="submit" style={submitButtonStyle} disabled={isLoading}>
              {isLoading ? 'Verifying…' : 'Run Verification'}
            </button>
            <Link href="/" style={secondaryLinkStyle}>
              ← Back to Home
            </Link>
          </div>

          {!canSubmit && submitted && !error && (
            <p style={{ color: '#f87171', fontSize: '0.9rem' }}>
              Enter at least one lookup value to run verification.
            </p>
          )}

          {error && (
            <p style={{ color: '#f87171', fontSize: '0.95rem' }}>
              {error}
            </p>
          )}

          {warnings.length > 0 && (
            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: '#facc15', fontSize: '0.9rem' }}>
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </form>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '1.2rem' }}>Verification Results</h2>
        {isLoading && <p style={{ opacity: 0.75 }}>Checking organizer records…</p>}
        {!isLoading && results.length === 0 && submitted && !error && (
          <p style={{ opacity: 0.75 }}>
            No matching claims were found. Double-check the code, wallet, or signature and try again.
          </p>
        )}
        {!isLoading && results.length === 0 && !submitted && (
          <p style={{ opacity: 0.75 }}>
            Submit a claim code, wallet address, or transaction signature to view verification details.
          </p>
        )}

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {results.map((match) => (
            <div
              key={match.id}
              style={{
                border: '1px solid rgba(148, 163, 184, 0.25)',
                borderRadius: '14px',
                padding: '1.5rem',
                background: 'rgba(15, 23, 42, 0.6)',
                display: 'grid',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                <span style={statusPillStyle(match.minted)}>
                  {match.minted ? 'Minted' : match.status.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.9rem', opacity: 0.75 }}>
                  Sources: {match.sources.join(', ')}
                </span>
              </div>

              <div style={{ display: 'grid', gap: '0.35rem' }}>
                <h3 style={{ fontSize: '1.35rem', margin: 0 }}>{match.event.name}</h3>
                <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.75 }}>{match.event.description}</p>
              </div>

              <div style={{ display: 'grid', gap: '0.4rem', fontSize: '0.95rem' }}>
                <div>
                  <strong>Claim Code:</strong> {match.code}
                </div>
                <div>
                  <strong>Wallet:</strong>{' '}
                  {match.wallet ? (
                    <a
                      href={`https://solscan.io/account/${match.wallet}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#22d3ee' }}
                    >
                      {shorten(match.wallet) ?? 'View Wallet'}
                    </a>
                  ) : (
                    'Not yet assigned'
                  )}
                </div>
                <div>
                  <strong>Transaction:</strong>{' '}
                  {match.txSignature ? (
                    <a
                      href={`https://solscan.io/tx/${match.txSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#22d3ee' }}
                    >
                      {shorten(match.txSignature, 8) ?? 'View Transaction'}
                    </a>
                  ) : (
                    'Pending finalization'
                  )}
                </div>
                <div>
                  <strong>Collection Mint:</strong>{' '}
                  <a
                    href={`https://solscan.io/token/${match.event.collectionMint}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#22d3ee' }}
                  >
                    {shorten(match.event.collectionMint, 6) ?? match.event.collectionMint}
                  </a>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2rem', fontSize: '0.85rem', opacity: 0.7 }}>
                <span>Created: {new Date(match.createdAt).toLocaleString()}</span>
                <span>Updated: {new Date(match.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
