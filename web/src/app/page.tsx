import Link from 'next/link';

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: '2rem',
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.6)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '16px',
  padding: '2rem',
  boxShadow: '0 18px 65px rgba(15, 23, 42, 0.45)',
  maxWidth: '600px',
  textAlign: 'center' as const,
};

const buttonStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #22d3ee, #0ea5e9)',
  border: 'none',
  borderRadius: '12px',
  color: 'white',
  padding: '1rem 2rem',
  fontSize: '1rem',
  fontWeight: '600',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
  transition: 'all 0.2s',
  margin: '0.5rem',
};

const secondaryButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(148, 163, 184, 0.4)',
  borderRadius: '12px',
  color: '#e2e8f0',
  padding: '1rem 2rem',
  fontSize: '1rem',
  fontWeight: '600',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
  transition: 'all 0.2s',
  margin: '0.5rem',
};

export default function HomePage() {
  return (
    <main style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', background: 'linear-gradient(135deg, #22d3ee, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Proof of Presence
        </h1>
        <p style={{ lineHeight: 1.6, marginBottom: '2rem', opacity: 0.8 }}>
          Create events with Collection NFTs and let visitors mint verifiable Proof of Presence NFTs 
          by capturing photos. All NFTs are permanently stored on Arweave and verified under event collections.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
          <div>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>For Event Organizers</h3>
            <Link href="/organizer" style={buttonStyle}>
              🎯 Organizer Dashboard
            </Link>
          </div>
          
          <div style={{ margin: '1rem 0', opacity: 0.5 }}>
            ────────────────
          </div>
          
          <div>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>For Visitors</h3>
            <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1rem' }}>
              Scan a QR code or enter a claim code to test the visitor flow:
            </p>
            <Link href="/claim/demo-code" style={secondaryButtonStyle}>
              📸 Try Demo Claim
            </Link>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.2rem' }}>For Verifiers</h3>
            <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1rem' }}>
              Confirm that a Proof of Presence NFT was minted under the correct collection using a
              claim code, wallet, or transaction signature.
            </p>
            <Link href="/verify" style={secondaryButtonStyle}>
              ✅ Verify a Proof
            </Link>
          </div>
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(34, 211, 238, 0.1)', borderRadius: '8px', fontSize: '0.9rem' }}>
          <p style={{ margin: 0, opacity: 0.8 }}>
            <strong>Complete Flow:</strong> Create Event → Generate Claim Codes → Visitors Scan → Capture Photo → Mint NFT → Verify Proof
          </p>
        </div>
      </div>
    </main>
  );
}
