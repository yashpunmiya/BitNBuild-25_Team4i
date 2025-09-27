'use client';

import { Buffer } from 'buffer';
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { VersionedTransaction } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const containerStyle: CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
  padding: '2rem 1.5rem 4rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
};

const cardStyle: CSSProperties = {
  background: 'rgba(15, 23, 42, 0.6)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '16px',
  padding: '1.5rem',
  boxShadow: '0 18px 65px rgba(15, 23, 42, 0.45)',
};

const buttonStyle: CSSProperties = {
  background: 'linear-gradient(135deg, #22d3ee, #0ea5e9)',
  border: 'none',
  borderRadius: '12px',
  color: '#0f172a',
  fontWeight: 600,
  padding: '0.85rem 1.6rem',
  cursor: 'pointer',
  fontSize: '1rem',
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: 'transparent',
  border: '1px solid rgba(148, 163, 184, 0.4)',
  color: '#e2e8f0',
};

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isBusy = useMemo(() => status !== 'idle' && status !== 'success', [status]);

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
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p>Loading event…</p>
      </main>
    );
  }

  if (error && !claim) {
    return (
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p>{error}</p>
      </main>
    );
  }

  if (!claim?.event) {
    return (
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p>Claim not available.</p>
      </main>
    );
  }

  return (
    <main style={containerStyle}>
      <section style={cardStyle}>
        <header style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>
            Claim Code • {claim.code}
          </p>
          <h1 style={{ fontSize: '2.25rem', marginTop: '0.4rem', marginBottom: '0.75rem' }}>{claim.event.name}</h1>
          <p style={{ lineHeight: 1.6 }}>{claim.event.description}</p>
        </header>
        <WalletMultiButton style={{ alignSelf: 'flex-start' }} />
      </section>

      <section style={cardStyle}>
        <h2 style={{ fontSize: '1.35rem', marginBottom: '1rem' }}>1. Capture your Proof of Presence</h2>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <video
            ref={videoRef}
            style={{ width: '100%', borderRadius: '12px', display: photoData ? 'none' : 'block' }}
            playsInline
            muted
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {photoData && photoDimensions && (
            <Image
              src={photoData}
              alt="Captured snapshot"
              width={photoDimensions.width}
              height={photoDimensions.height}
              style={{ width: '100%', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.3)', height: 'auto' }}
              unoptimized
            />
          )}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {stream ? (
              <button style={buttonStyle} onClick={capturePhoto} disabled={isBusy}>
                Capture Snapshot
              </button>
            ) : (
              <button style={buttonStyle} onClick={startCamera} disabled={isBusy}>
                {photoData ? 'Retake Snapshot' : 'Start Camera'}
              </button>
            )}
            {photoData && (
              <button style={secondaryButtonStyle} onClick={resetFlow} disabled={isBusy}>
                Retake
              </button>
            )}
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ fontSize: '1.35rem', marginBottom: '1rem' }}>2. Mint your NFT</h2>
        <ol style={{ paddingLeft: '1.2rem', marginBottom: '1.5rem', lineHeight: 1.8 }}>
          <li>Connect a Solana wallet – the event organizer pays the fees.</li>
          <li>Capture a clear snapshot to store permanently on Arweave.</li>
          <li>Sign the mint transaction when prompted to receive your NFT.</li>
        </ol>
        <button style={buttonStyle} onClick={handleSubmit} disabled={isBusy}>
          {status === 'success' ? 'Minted!' : 'Mint Proof of Presence'}
        </button>
        {isBusy && status !== 'idle' && status !== 'success' && (
          <p style={{ marginTop: '1rem', opacity: 0.75 }}>{statusCopy[status]}</p>
        )}
        {signature && (
          <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
            Transaction signature:{' '}
            <a
              href={`https://solscan.io/tx/${signature}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#22d3ee' }}
            >
              {signature}
            </a>
          </p>
        )}
        {error && (
          <p style={{ marginTop: '1rem', color: '#fda4af' }}>{error}</p>
        )}
      </section>
    </main>
  );
}










