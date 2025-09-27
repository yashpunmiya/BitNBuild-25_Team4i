export default function HomePage() {
  return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '520px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Proof of Presence</h1>
        <p style={{ lineHeight: 1.6 }}>
          Scan an event QR code to open your unique claim link. You&apos;ll capture a photo,
          connect your Solana wallet, and mint a verifiable Proof of Presence NFT that lives
          inside the event&apos;s collection.
        </p>
      </div>
    </main>
  );
}
