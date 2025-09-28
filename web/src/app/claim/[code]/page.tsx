'use client';

import { Buffer } from 'buffer';
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { VersionedTransaction } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

import styles from './claim.module.css';

// Import WalletMultiButton with SSR disabled to prevent hydration mismatch
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  {
    ssr: false,
    loading: () => (
      <button className={styles.walletLoading} disabled>
        Loading wallet…
      </button>
    ),
  },
);

type ClaimStatus = 'idle' | 'uploading' | 'building' | 'signing' | 'finalizing' | 'success';
type ClaimResponse = {
  code: string;
  status: string;
  wallet: string | null;
  event: {
    id: string;
    name: string;
    description: string;
    collectionMint: string;
  };
};

type MetadataResponse = {
  metadataUri: string;
  imageUri: string;
};

type BuildTransactionResponse = {
  transaction: string;
  mint: string;
  blockhash: string;
  lastValidBlockHeight: number;
  feePayer: string;
};

type FinalizeResponse = {
  signature: string;
};

const statusCopy: Record<Exclude<ClaimStatus, 'idle' | 'success'>, string> = {
  uploading: 'Uploading your snapshot to Arweave…',
  building: 'Building your mint transaction…',
  signing: 'Waiting for wallet signature…',
  finalizing: 'Finalizing on Solana…',
};

const shortenAddress = (address: string): string =>
  address.length <= 10 ? address : `${address.slice(0, 4)}…${address.slice(-4)}`;

export default function ClaimPage({ params }: { params: Promise<{ code: string }> }) {
  const [code, setCode] = useState<string>('');
  
  useEffect(() => {
    const resolveParams = async () => {
      const { code: resolvedCode } = await params;
      setCode(resolvedCode);
    };
    resolveParams();
  }, [params]);
  const { publicKey, signTransaction } = useWallet();
  const [claim, setClaim] = useState<ClaimResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [photoDimensions, setPhotoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [signature, setSignature] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [metadataInfo, setMetadataInfo] = useState<MetadataResponse | null>(null);
  const [buildDetails, setBuildDetails] = useState<BuildTransactionResponse | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isBusy = useMemo(() => status !== 'idle' && status !== 'success', [status]);

  const verifyLink = useMemo(() => {
    if (!signature) {
      return null;
    }

    const params = new URLSearchParams();

    if (claim?.code) {
      params.set('code', claim.code);
    }

    params.set('tx', signature);

    if (claim?.wallet) {
      params.set('wallet', claim.wallet);
    }

    return `/verify?${params.toString()}`;
  }, [claim, signature]);

  useEffect(() => {
    if (!code) return;
    
    let cancelled = false;

    const fetchClaim = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/claim/${code}`);
        if (!response.ok) {
          throw new Error('Unable to load claim');
        }
        const data: ClaimResponse = await response.json();
        if (!cancelled) {
          setClaim(data);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load claim');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchClaim();

    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setStream(mediaStream);
      setPhotoData(null);
      setPhotoDimensions(null);
      setError(null);
    } catch (cameraError) {
      console.error('Camera access denied', cameraError);
      setError('Unable to access camera. Please allow permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const width = videoRef.current.videoWidth;
    const height = videoRef.current.videoHeight;
    const context = canvasRef.current.getContext('2d');

    if (!context || width === 0 || height === 0) {
      setError('Unable to capture snapshot. Please try again.');
      return;
    }

    canvasRef.current.width = width;
    canvasRef.current.height = height;
    context.drawImage(videoRef.current, 0, 0, width, height);
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setPhotoData(dataUrl);
    setPhotoDimensions({ width, height });
    stopCamera();
  };

  const resetFlow = () => {
    setPhotoData(null);
    setPhotoDimensions(null);
    setStatus('idle');
    setSignature(null);
    setError(null);
    setMetadataInfo(null);
    setBuildDetails(null);
    startCamera();
  };

  const handleSubmit = async () => {
    if (!claim?.event) {
      setError('Claim not ready.');
      return;
    }
    if (!publicKey) {
      setError('Connect a wallet first.');
      return;
    }
    if (!photoData) {
      setError('Capture a snapshot before minting.');
      return;
    }
    if (!signTransaction) {
      setError('This wallet cannot sign transactions in the browser.');
      return;
    }

    setError(null);
    setMetadataInfo(null);
    setBuildDetails(null);

    try {
      setStatus('uploading');
      const metadataResponse = await fetch('/api/metadata/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: claim.code, imageDataUrl: photoData }),
      });
      if (!metadataResponse.ok) {
        throw new Error('Failed to upload snapshot.');
      }
      const metadata: MetadataResponse = await metadataResponse.json();
      setMetadataInfo(metadata);

      setStatus('building');
      const buildResponse = await fetch('/api/claim/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: claim.code,
          owner: publicKey.toBase58(),
          metadataUri: metadata.metadataUri,
        }),
      });
      if (!buildResponse.ok) {
        throw new Error('Failed to build transaction.');
      }
    const build: BuildTransactionResponse = await buildResponse.json();
    setBuildDetails(build);

      setStatus('signing');
      const versionedTx = VersionedTransaction.deserialize(Buffer.from(build.transaction, 'base64'));
      const signedTx = await signTransaction(versionedTx);

      setStatus('finalizing');
      const finalizedResponse = await fetch('/api/claim/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: claim.code,
          signedTx: Buffer.from(signedTx.serialize()).toString('base64'),
        }),
      });

      if (!finalizedResponse.ok) {
        throw new Error('Failed to finalize transaction.');
      }

      const finalized: FinalizeResponse = await finalizedResponse.json();
      setSignature(finalized.signature);
      setStatus('success');
    } catch (mintError) {
      console.error(mintError);
      setStatus('idle');
      setError(mintError instanceof Error ? mintError.message : 'Unexpected error while minting.');
    }
  };

  if (loading) {
    return (
      <main className={styles.statePage}>
        <p>Loading event…</p>
      </main>
    );
  }

  if (error && !claim) {
    return (
      <main className={styles.statePage}>
        <p>{error}</p>
      </main>
    );
  }

  if (!claim?.event) {
    return (
      <main className={styles.statePage}>
        <p>Claim not available.</p>
      </main>
    );
  }

  const isClaimComplete = status === 'success' || claim.status === 'claimed';
  const statusTagClass = isClaimComplete ? styles.tag : `${styles.tag} ${styles.tagInactive}`;

  const flowSteps: Array<{ key: ClaimStatus; label: string; helper?: string }> = [
    { key: 'uploading', label: 'Upload snapshot', helper: 'Save your proof on Arweave.' },
    { key: 'building', label: 'Build transaction', helper: 'Prepare your mint transaction.' },
    { key: 'signing', label: 'Sign transaction', helper: 'Approve the mint from your wallet.' },
    { key: 'finalizing', label: 'Finalize on-chain', helper: 'Confirm the mint on Solana.' },
    { key: 'success', label: 'Mint complete!', helper: 'Celebrate your brand-new proof.' },
  ];

  const currentStatus = isClaimComplete ? 'success' : status;
  const currentStepIndex =
    currentStatus === 'idle'
      ? -1
      : flowSteps.findIndex((step) => step.key === currentStatus);

  return (
    <main className={styles.page}>
      <div className={styles.pageBackdrop} aria-hidden />
      <div className={styles.shell}>
        <section className={`${styles.card} ${styles.heroCard}`}>
          <div className={styles.heroGlow} aria-hidden />
          <div className={styles.heroContent}>
            <span className={styles.heroEyebrow}>Claim Code • {claim.code}</span>
            <h1 className={styles.heroTitle}>{claim.event.name}</h1>
            <p className={styles.heroDescription}>{claim.event.description}</p>
            <div className={styles.summaryRow}>
              <span className={statusTagClass}>{isClaimComplete ? 'Mint ready' : 'Awaiting proof'}</span>
              <span className={styles.summaryMuted}>Collection: {claim.event.collectionMint}</span>
            </div>
            <div className={styles.detailList}>
              <span>
                <strong>Status:</strong> {claim.status}
              </span>
              {claim.wallet && (
                <span>
                  <strong>Claimed by:</strong> {claim.wallet}
                </span>
              )}
            </div>
          </div>
          <div className={styles.walletRow}>
            <span className={styles.walletHelper}>Connect to continue</span>
            <WalletMultiButton />
          </div>
        </section>

        <div className={styles.gridTwo}>
          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <div>
                <span className={styles.stepBadge}>Step 1</span>
                <h2>Capture your proof of presence</h2>
              </div>
              <p className={styles.supportCopy}>
                Start the camera, snap your event selfie, and we’ll use it to personalize your adorable NFT badge.
              </p>
            </header>
            <div className={styles.cameraFrame}>
              <video
                ref={videoRef}
                className={`${styles.cameraFeed} ${photoData ? styles.hidden : ''}`}
                playsInline
                muted
              />
              <canvas ref={canvasRef} className={styles.hidden} />
              {photoData && photoDimensions && (
                <Image
                  src={photoData}
                  alt="Captured snapshot"
                  width={photoDimensions.width}
                  height={photoDimensions.height}
                  className={styles.snapshotImage}
                  unoptimized
                />
              )}
            </div>
            <div className={styles.buttonRow}>
              {stream ? (
                <button className={styles.primaryButton} onClick={capturePhoto} disabled={isBusy}>
                  Capture snapshot
                </button>
              ) : (
                <button className={styles.primaryButton} onClick={startCamera} disabled={isBusy}>
                  {photoData ? 'Retake snapshot' : 'Start camera'}
                </button>
              )}
              {photoData && (
                <button className={styles.secondaryButton} onClick={resetFlow} disabled={isBusy}>
                  Retake
                </button>
              )}
            </div>
          </section>

          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <div>
                <span className={styles.stepBadge}>Step 2</span>
                <h2>Mint your keepsake NFT</h2>
              </div>
              <p className={styles.supportCopy}>
                Connect a wallet, review the steps, and let the organizer handle the gas so you can focus on memories.
              </p>
            </header>
            <ol className={styles.stepList}>
              <li>Connect a Solana wallet – the organizer covers minting fees.</li>
              <li>Capture and upload your snapshot to permanent storage.</li>
              <li>Approve the transaction when prompted to receive your NFT.</li>
            </ol>
            <ul className={styles.progressList}>
              {flowSteps.map((step, index) => {
                const isComplete = currentStepIndex > index || isClaimComplete;
                const isActive = index === currentStepIndex;

                return (
                  <li
                    key={step.key}
                    className={`${styles.progressItem} ${
                      isComplete ? styles.progressComplete : ''
                    } ${isActive ? styles.progressActive : ''}`}
                  >
                    <span className={styles.progressIndicator} aria-hidden />
                    <div className={styles.progressCopy}>
                      <span className={styles.progressLabel}>{step.label}</span>
                      {step.helper && <span className={styles.progressHelper}>{step.helper}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
            <button className={styles.primaryButton} onClick={handleSubmit} disabled={isBusy}>
              {isClaimComplete ? 'Minted!' : 'Mint proof of presence'}
            </button>
            {isBusy && status !== 'idle' && status !== 'success' && (
              <p className={`${styles.statusMessage} ${styles.statusPulse}`} aria-live="polite">
                {statusCopy[status]}
              </p>
            )}
            {buildDetails?.feePayer && (
              <p className={styles.statusMessage}>
                Organizer fee payer:{' '}
                <a
                  href={`https://solscan.io/account/${buildDetails.feePayer}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.infoLink}
                >
                  {shortenAddress(buildDetails.feePayer)}
                </a>
              </p>
            )}
            {signature && (
              <p className={styles.statusMessage}>
                Transaction signature:{' '}
                <a
                  href={`https://solscan.io/tx/${signature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.infoLink}
                  title={signature}
                >
                  {shortenAddress(signature)}
                </a>
              </p>
            )}
            {verifyLink && (
              <p className={styles.statusMessage}>
                <Link href={verifyLink} className={styles.infoLink}>
                  Verify this proof on the public portal ↗
                </Link>
              </p>
            )}
            
            {error && <p className={styles.alert}>{error}</p>}
          </section>
        </div>
      </div>
    </main>
  );
}










