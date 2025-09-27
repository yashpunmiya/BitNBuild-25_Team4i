'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  textAlign: 'center',
  gap: '1.5rem',
};

export default function SoldOutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [eventName, setEventName] = useState<string | undefined>();

  useEffect(() => {
    const resolveParams = async () => {
      const params = await searchParams;
      setEventName(params.event);
    };

    void resolveParams();
  }, [searchParams]);

  return (
    <main style={containerStyle}>
      <h1 style={{ fontSize: '2rem' }}>All Proofs Claimed</h1>
      <p style={{ maxWidth: '520px', opacity: 0.8 }}>
        We&apos;re out of claimable codes{eventName ? ` for ${eventName}` : ''}. You can check back in a
        bit in case the organizer releases more reservations, or reach out to them directly for help.
      </p>
      <Link
        href="/"
        style={{
          color: '#22d3ee',
          fontWeight: 600,
          textDecoration: 'none',
          border: '1px solid rgba(148,163,184,0.35)',
          borderRadius: '12px',
          padding: '0.75rem 1.5rem',
        }}
      >
        Return to homepage
      </Link>
    </main>
  );
}
