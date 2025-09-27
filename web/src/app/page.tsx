import type { ReactElement } from 'react';
import Link from 'next/link';

import styles from './page.module.css';

const heroStats = [
  { value: 'Gasless', label: 'Organizer-covered minting' },
  { value: 'Arweave', label: 'Permanent storage via Bundlr' },
  { value: 'Collection-verified', label: 'Every NFT linked to your event' },
];

const features = [
  {
    icon: '🎯',
    title: 'Organizer Dashboard',
    description:
      'Mint a collection NFT, manage claim inventory, and monitor fee-payer balance from a single control center.',
    action: (
      <Link href="/organizer" className="ui-button ui-button-primary">
        Launch Dashboard
      </Link>
    ),
  },
  {
    icon: '📸',
    title: 'Visitor Minting',
    description:
      'Attendees scan a QR, capture an in-browser snapshot, and receive a proof-of-presence NFT signed by your collection.',
    action: (
      <Link href="/claim/demo-code" className="ui-button ui-button-secondary">
        Try Demo Claim
      </Link>
    ),
  },
  {
    icon: '🔍',
    title: 'Public Verification',
    description:
      'Anyone can confirm authenticity with a claim code, wallet, or transaction signature to ensure it was minted correctly.',
    action: (
      <Link href="/verify" className="ui-button ui-button-ghost">
        Open Verification
      </Link>
    ),
  },
];

const flowSteps = [
  {
    title: 'Create your event collection',
    copy:
      'Provision a collection NFT on Solana devnet and set up Bundlr-backed storage so proofs are permanent from day one.',
  },
  {
    title: 'Distribute smart claim codes',
    copy:
      'Generate dynamic QR codes that reserve claims just-in-time, preventing double usage while keeping the line moving.',
  },
  {
    title: 'Capture and mint proof',
    copy:
      'Visitors snap a selfie, we frame it in your template, upload to Arweave, and co-sign a gasless mint transaction.',
  },
  {
    title: 'Verify and celebrate',
    copy:
      'Our verifier portal and explorer links make it effortless to audit every proof and highlight your community moments.',
  },
];

export default function HomePage(): ReactElement {
  return (
    <main className="app-shell">
      <section className="surface-card surface-card--accent">
        <div className={styles.hero}>
          <div>
            <div className="section-heading">
              <span className="section-heading__eyebrow">Solana Proof of Presence</span>
              <h1 className="section-heading__title">Elevate your IRL activations with collectible proof</h1>
              <p className="section-heading__description">
                Deliver a polished, on-brand minting experience where every attendee receives a verifiable NFT backed by
                your event collection and stored forever on Arweave.
              </p>
            </div>

            <div className={styles.heroActions}>
              <Link href="/organizer" className="ui-button ui-button-primary">
                Start as Organizer
              </Link>
              <Link href="/claim/demo-code" className="ui-button ui-button-secondary">
                Experience Visitor Flow
              </Link>
              <Link href="/verify" className="ui-button ui-button-ghost">
                Verify a Proof
              </Link>
            </div>

            <div className={styles.heroStats}>
              {heroStats.map((stat) => (
                <div key={stat.label} className={styles.heroStat}>
                  <span className={styles.heroStatValue}>{stat.value}</span>
                  <span className={styles.heroStatLabel}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroVisualCanvas} />
            <div className={styles.heroVisualFrame}>POP</div>
          </div>
        </div>
      </section>

      <section className="surface-card">
        <header className="section-heading">
          <span className="section-heading__eyebrow">Why it works</span>
          <h2 className="section-heading__title">Everything you need from activation to audit</h2>
          <p className="section-heading__description">
            Streamline event ops with one toolkit. Mint, manage, and verify proofs while keeping the UX polished in a
            light, modern interface tailored for Web3 brand experiences.
          </p>
        </header>

        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <div key={feature.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.6rem' }}>{feature.title}</h3>
                <p style={{ color: 'var(--muted)', lineHeight: 1.65 }}>{feature.description}</p>
              </div>
              <div>{feature.action}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card surface-card--muted">
        <header className="section-heading">
          <span className="section-heading__eyebrow">Complete flow</span>
          <h2 className="section-heading__title">From idea to verified proof</h2>
          <p className="section-heading__description">
            We combine Supabase, Bundlr, and Metaplex Umi to orchestrate every step. Your attendees enjoy a seamless
            claim experience while you maintain full visibility.
          </p>
        </header>

        <div className="ui-divider" />

        <ol className={styles.flowList}>
          {flowSteps.map((step) => (
            <li key={step.title} className={styles.flowItem}>
              <span className={styles.flowTitle}>{step.title}</span>
              <span className={styles.flowCopy}>{step.copy}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
