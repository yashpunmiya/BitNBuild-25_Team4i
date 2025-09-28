'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEventHandler, type ReactElement } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import styles from './verify.module.css';

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
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.card}>
          <header className={styles.heroHeader}>
            <p className={styles.eyebrow}>Proof of Presence • Verification</p>
            <h1 className={styles.title}>Verify a Minted Proof</h1>
            <p className={styles.subtitle}>
              Confirm a visitor&apos;s Proof of Presence NFT by entering the claim code, the minted wallet address, or the
              transaction signature. The verifier queries organizer records to ensure the NFT was minted under the
              correct collection.
            </p>
          </header>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputRow}>
              <label className={styles.label}>
                <span>Claim Code</span>
                <input
                  className={styles.input}
                  placeholder="e.g. POP-1234 or demo-code"
                  value={claimCode}
                  onChange={(event) => setClaimCode(event.target.value)}
                  autoComplete="off"
                />
              </label>
              <label className={styles.label}>
                <span>Wallet Address</span>
                <input
                  className={styles.input}
                  placeholder="Solana wallet that received the proof"
                  value={wallet}
                  onChange={(event) => setWallet(event.target.value)}
                  autoComplete="off"
                />
              </label>
              <label className={styles.label}>
                <span>Transaction Signature</span>
                <input
                  className={styles.input}
                  placeholder="Solana transaction signature"
                  value={txSignature}
                  onChange={(event) => setTxSignature(event.target.value)}
                  autoComplete="off"
                />
              </label>
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.primaryButton} disabled={isLoading}>
                {isLoading ? 'Verifying…' : 'Run verification'}
              </button>
              <Link href="/" className={styles.secondaryLink}>
                ← Back to Home
              </Link>
            </div>

            {!canSubmit && submitted && !error && (
              <p className={styles.inlineError}>Enter at least one lookup value to run verification.</p>
            )}

            {error && <p className={styles.inlineError}>{error}</p>}

            {warnings.length > 0 && (
              <ul className={styles.warningList}>
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </form>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Verification Results</h2>
          {isLoading && <p className={styles.stateMessage}>Checking organizer records…</p>}
          {!isLoading && results.length === 0 && submitted && !error && (
            <p className={styles.stateMessage}>
              No matching claims were found. Double-check the code, wallet, or signature and try again.
            </p>
          )}
          {!isLoading && results.length === 0 && !submitted && (
            <p className={styles.stateMessage}>
              Submit a claim code, wallet address, or transaction signature to view verification details.
            </p>
          )}

          <div className={styles.resultList}>
            {results.map((match) => {
              const pillClass = match.minted ? `${styles.pill} ${styles.pillMinted}` : styles.pill;

              return (
                <div key={match.id} className={styles.resultCard}>
                  <div className={styles.resultHeader}>
                    <span className={pillClass}>{match.minted ? 'Minted' : match.status.toUpperCase()}</span>
                    <span className={styles.stateMessage}>Sources: {match.sources.join(', ')}</span>
                  </div>

                  <div>
                    <h3 className={styles.resultTitle}>{match.event.name}</h3>
                    <p className={styles.resultSubtitle}>{match.event.description}</p>
                  </div>

                  <div className={styles.detailGrid}>
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
                          className={styles.resultLink}
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
                          className={styles.resultLink}
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
                        className={styles.resultLink}
                      >
                        {shorten(match.event.collectionMint, 6) ?? match.event.collectionMint}
                      </a>
                    </div>
                  </div>

                  <div className={styles.timestampRow}>
                    <span>Created: {new Date(match.createdAt).toLocaleString()}</span>
                    <span>Updated: {new Date(match.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
