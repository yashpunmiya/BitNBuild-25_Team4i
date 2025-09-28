'use client';

import Link from 'next/link';
import {
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useState,
} from 'react';

const pageWrapper: CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#fffef7',
  backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23fde047" fill-opacity="0.1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
  backgroundRepeat: 'repeat',
  color: '#5b4334',
  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont",
  display: 'flex',
  flexDirection: 'column',
};

const contentWrapper: CSSProperties = {
  width: 'min(1100px, 90vw)',
  margin: '0 auto',
  padding: '4.5rem 0 3rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '4rem',
};

const heroSection: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  textAlign: 'center',
  alignItems: 'center',
  position: 'relative',
  padding: '2rem 1rem',
  minHeight: '600px',
  justifyContent: 'center',
};

const heroImage: CSSProperties = {
  width: '100%',
  maxWidth: '440px',
  
  borderRadius: '32px',

};

const heroTitle: CSSProperties = {
 
  fontSize: '3.5rem',
  lineHeight: 1.1,
  color: '#b45309',
  textShadow: '3px 3px 0px #ffffff, -3px -3px 0px #ffffff, 3px -3px 0px #ffffff, -3px 3px 0px #ffffff, 6px 6px 0px rgba(250, 204, 21, 0.3)',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '2px',
};

const heroSubtitle: CSSProperties = {
  maxWidth: '720px',
  fontSize: '1.15rem',
  lineHeight: 1.7,
  color: '#7c6d4f',
};

const buttonRow: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1rem',
};

const primaryButtonRestShadow = '0 8px 0 #d68c1f, 0 18px 32px rgba(214, 140, 31, 0.22)';
const primaryButtonHoverShadow = '0 12px 0 #d68c1f, 0 24px 40px rgba(214, 140, 31, 0.28)';
const secondaryButtonRestShadow = '0 8px 0 rgba(250, 204, 21, 0.55), 0 18px 32px rgba(250, 204, 21, 0.18)';
const secondaryButtonHoverShadow = '0 12px 0 rgba(250, 204, 21, 0.55), 0 24px 40px rgba(250, 204, 21, 0.25)';

const baseButton: CSSProperties = {
  padding: '1rem 2.75rem',
  borderRadius: '9999px',
  fontSize: '1.05rem',
  fontWeight: 700,
  textDecoration: 'none',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.6rem',
  border: 'none',
  cursor: 'pointer'
};

const primaryButton: CSSProperties = {
  ...baseButton,
  background: '#facc15',
  color: '#5b4334',
  boxShadow: primaryButtonRestShadow,
};

const secondaryButton: CSSProperties = {
  ...baseButton,
  background: '#ffffff',
  color: '#a16207',
  border: '2px solid #facc15',
  boxShadow: secondaryButtonRestShadow
};

const createButtonLiftHandlers = (restShadow: string, hoverShadow: string) => {
  const apply = (element: HTMLAnchorElement) => {
    element.style.transform = 'translateY(-4px)';
    element.style.boxShadow = hoverShadow;
  };

  const reset = (element: HTMLAnchorElement) => {
    element.style.transform = 'translateY(0)';
    element.style.boxShadow = restShadow;
  };

  return {
    onMouseEnter: (event: ReactMouseEvent<HTMLAnchorElement>) => apply(event.currentTarget),
    onMouseLeave: (event: ReactMouseEvent<HTMLAnchorElement>) => reset(event.currentTarget),
    onFocus: (event: ReactFocusEvent<HTMLAnchorElement>) => apply(event.currentTarget),
    onBlur: (event: ReactFocusEvent<HTMLAnchorElement>) => reset(event.currentTarget),
  };
};

const twoColumnSection: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '2.5rem',
  padding: '2.5rem',
  borderRadius: '24px',
  background: '#fff8d6',
  border: '1px solid rgba(245, 158, 11, 0.35)',
  boxShadow: '0 16px 45px rgba(245, 158, 11, 0.18)',
};

const columnHeading: CSSProperties = {
  fontSize: '1.6rem',
  marginBottom: '1rem',
  color: '#b45309',
};

const solutionColumn: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'flex-start'
};

const problemColumn: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem'
};

const problemPointsWrapper: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '1rem'
};

const problemPointCard: CSSProperties = {
  background: '#ffffff',
  borderRadius: '18px',
  border: '1px solid rgba(234, 179, 8, 0.4)',
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.65rem',
  boxShadow: '0 10px 24px rgba(250, 204, 21, 0.16)'
};

const problemPointIconWrap: CSSProperties = {
  width: '46px',
  height: '46px',
  borderRadius: '16px',
  background: '#fff9e6',
  border: '1px solid rgba(250, 204, 21, 0.4)',
  display: 'grid',
  placeItems: 'center'
};

const problemPointIcon: CSSProperties = {
  width: '28px',
  height: '28px'
};

const problemPointTitle: CSSProperties = {
  margin: 0,
  color: '#b45309',
  fontSize: '1.05rem',
  fontWeight: 600
};

const problemPointDescription: CSSProperties = {
  margin: 0,
  fontSize: '0.92rem',
  lineHeight: 1.5,
  color: '#7c6d4f'
};

const solutionImage: CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  marginTop: '0.5rem',
  borderRadius: '28px',
  boxShadow: '0 16px 40px rgba(245, 158, 11, 0.22)',
  alignSelf: 'center'
};

const paragraph: CSSProperties = {
  fontSize: '1.05rem',
  lineHeight: 1.75,
  color: '#7c6d4f',
};

const flowSection: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '1.8rem',
};

const flowCard: CSSProperties = {
  background: '#ffffff',
  border: '3px solid #facc15',
  borderRadius: '30px',
  padding: '2rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  boxShadow: '0 15px 40px rgba(250, 204, 21, 0.25)',
  position: 'relative',
  overflow: 'hidden',
};

const flowNumber: CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  background: '#facc15',
  color: '#5b4334',
  fontWeight: 700,
  fontSize: '1.1rem',
};

const flowImage: CSSProperties = {
  width: '100%',
  maxWidth: '220px',
  margin: '0.5rem auto 0.75rem',
  borderRadius: '24px',
  boxShadow: '0 12px 30px rgba(250, 204, 21, 0.2)'
};

const badgeGallerySection: CSSProperties = {
  padding: '3rem',
  borderRadius: '28px',
  background: '#fff9e6',
  border: '1px solid rgba(250, 204, 21, 0.3)',
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem'
};

const galleryTrack: CSSProperties = {
  display: 'flex',
  gap: '1.5rem',
  overflowX: 'auto',
  paddingBottom: '0.5rem',
  scrollSnapType: 'x mandatory'
};

const galleryCard: CSSProperties = {
  minWidth: '260px',
  borderRadius: '24px',
  background: '#ffffff',
  border: '2px solid rgba(250, 204, 21, 0.35)',
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  boxShadow: '0 14px 40px rgba(250, 204, 21, 0.2)',
  scrollSnapAlign: 'center'
};

const galleryImage: CSSProperties = {
  width: '100%',
  borderRadius: '18px',
  boxShadow: '0 12px 28px rgba(217, 119, 6, 0.18)'
};

const galleryHint: CSSProperties = {
  fontSize: '0.9rem',
  color: '#a16207',
  textAlign: 'center'
};

const featuresGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '1.5rem',
  maxWidth: '960px',
  margin: '0 auto',
};

const featureCardBase: CSSProperties = {
  borderRadius: '20px',
  border: '2px solid rgba(244, 179, 52, 0.4)',
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '1rem',
  boxShadow: '0 10px 32px rgba(250, 204, 21, 0.18)',
  textAlign: 'center',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  cursor: 'pointer',
};

const featuresImage: CSSProperties = {
  width: '100%',
  maxWidth: '680px',
  margin: '0 auto 2rem',
  borderRadius: '32px',
  boxShadow: '0 18px 48px rgba(250, 204, 21, 0.25)',
  display: 'block'
};

const featureTitle: CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 600,
  color: '#b45309',
};

const featureIconWrapper: CSSProperties = {
  width: '70px',
  height: '70px',
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  boxShadow: '0 6px 20px rgba(217, 119, 6, 0.18)',
  border: '3px solid rgba(255, 255, 255, 0.8)'
};

const featureDescription: CSSProperties = {
  color: '#7c6d4f',
  lineHeight: 1.5,
  fontSize: '0.98rem',
  margin: 0
};

const featureIconImage: CSSProperties = {
  width: '38px',
  height: '38px'
};

const socialProofSection: CSSProperties = {
  padding: '3rem',
  borderRadius: '28px',
  background: '#fff5c7',
  border: '1px solid rgba(250, 204, 21, 0.35)',
  display: 'flex',
  flexDirection: 'column',
  gap: '2.5rem',
  alignItems: 'center',
  position: 'relative',
  overflow: 'hidden'
};

const socialProofIllustration: CSSProperties = {
  width: '100%',
  maxWidth: '560px',
  borderRadius: '28px',
  boxShadow: '0 18px 48px rgba(250, 204, 21, 0.28)'
};

const tickerViewport: CSSProperties = {
  width: '100%',
  overflow: 'hidden',
  position: 'relative'
};

const tickerTrack: CSSProperties = {
  display: 'flex',
  gap: '1.75rem',
  width: 'max-content',
  animation: 'ticker 18s linear infinite',
  padding: '0.5rem 0'
};

const logoPill: CSSProperties = {
  borderRadius: '999px',
  border: '2px solid rgba(234, 179, 8, 0.6)',
  background: '#ffffff',
  padding: '0.85rem 1.75rem',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.4px',
  color: '#b45309',
  fontSize: '0.95rem',
  whiteSpace: 'nowrap',
  boxShadow: '0 10px 28px rgba(250, 204, 21, 0.16)'
};

const counterSection: CSSProperties = {
  padding: '3rem',
  borderRadius: '28px',
  background: '#fff8d6',
  border: '1px solid rgba(250, 204, 21, 0.35)',
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
  alignItems: 'center'
};

const counterGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '1.5rem',
  width: '100%'
};

const counterCard: CSSProperties = {
  borderRadius: '24px',
  background: '#ffffff',
  border: '2px solid rgba(246, 189, 36, 0.4)',
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.75rem',
  boxShadow: '0 12px 32px rgba(250, 204, 21, 0.18)'
};

const counterEmoji: CSSProperties = {
  fontSize: '1.8rem'
};

const counterNumber: CSSProperties = {
  fontSize: '2.4rem',
  fontWeight: 800,
  color: '#b45309',
  textShadow: '2px 2px 0px #ffffff, -2px -2px 0px #ffffff'
};

const counterLabel: CSSProperties = {
  color: '#7c6d4f',
  textAlign: 'center',
  fontSize: '1rem',
  lineHeight: 1.4
};

const testimonialSection: CSSProperties = {
  padding: '3.5rem',
  borderRadius: '32px',
  background: '#ffffff',
  border: '2px solid rgba(250, 204, 21, 0.35)',
  display: 'flex',
  flexDirection: 'column',
  gap: '2.5rem'
};

const testimonialGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '1.8rem'
};

const testimonialCard: CSSProperties = {
  borderRadius: '28px',
  background: '#fff8d6',
  padding: '1.8rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.2rem',
  border: '2px solid rgba(250, 204, 21, 0.35)',
  boxShadow: '0 12px 32px rgba(250, 204, 21, 0.18)'
};

const testimonialQuote: CSSProperties = {
  fontSize: '1.05rem',
  lineHeight: 1.7,
  color: '#7c6d4f',
  margin: 0
};

const testimonialAuthor: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.2rem',
  color: '#b45309',
  fontWeight: 600
};

const bannerCTA: CSSProperties = {
  borderRadius: '28px',
  padding: '3rem',
  background: '#f6c453',
  border: '1px solid rgba(217, 119, 6, 0.4)',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  textAlign: 'center',
  alignItems: 'center',
  boxShadow: '0 18px 55px rgba(217, 119, 6, 0.25)',
};

const ctaImage: CSSProperties = {
  width: '100%',
  maxWidth: '380px',
  opacity: 0.9,
  marginBottom: '1.5rem',
  borderRadius: '28px',
  boxShadow: '0 16px 40px rgba(217, 119, 6, 0.25)'
};

const footer: CSSProperties = {
  marginTop: 'auto',
  padding: '2rem 0',
  borderTop: '1px solid rgba(217, 119, 6, 0.25)',
  background: '#fff9e6',
};

const footerInner: CSSProperties = {
  width: 'min(1100px, 90vw)',
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  color: '#92400e',
  fontSize: '0.95rem',
};

const navLinksRow: CSSProperties = {
  display: 'flex',
  gap: '1.5rem',
  flexWrap: 'wrap',
  justifyContent: 'center',
};

const navLink: CSSProperties = {
  color: '#b45309',
  textDecoration: 'none',
  transition: 'opacity 0.2s ease',
};

const flowSteps = [
  {
    title: 'Create an Event',
    description: 'Set up your event and generate unique digital badges your attendees will love to collect.',
    image: '/images/event_creation.png',
    alt: 'Creating a POAP event illustration'
  },
  {
    title: 'Attendees Claim POAPs',
    description: 'Share a claim link or QR code so everyone can mint their proof of presence on any device for free.',
    image: '/images/claim_poap.png',
    alt: 'Claiming a POAP badge illustration'
  },
  {
    title: 'Verify Attendance',
    description: 'Keep a verifiable on-chain record that confirms exactly who showed up and when.',
    image: '/images/onchain_security.png',
    alt: 'On-chain attendance security illustration'
  },
];

const badgeExamples = [
  {
    title: 'DAO Anniversary Drop',
    description: 'Animated badge unlocked during the final keynote.',
    hue: '0deg'
  },
  {
    title: 'CreatorCon Quest',
    description: 'Collect all four daily badges to reveal a secret reward.',
    hue: '35deg'
  },
  {
    title: 'MetaFest Afterparty',
    description: 'Glow-in-the-dark art badge for late-night collectors.',
    hue: '-25deg'
  }
];

const counterStats = [
  { emoji: '🎟️', label: 'Events Hosted', value: 1280 },
  { emoji: '🏅', label: 'POAPs Claimed', value: 78500 },
  { emoji: '🌍', label: 'Communities Engaged', value: 92 }
];

const testimonials = [
  {
    quote: 'Our attendees love flashing their POAPs as proof they were part of the moment. Setup took less than ten minutes.',
    name: 'Maya Chen',
    role: 'Organizer, Community DAO'
  },
  {
    quote: 'The analytics dashboard helped us understand who actually showed up in person versus online. It was eye-opening.',
    name: 'Luis Ortega',
    role: 'Program Director, CreatorCon'
  },
  {
    quote: 'Claiming my badge felt playful and instant. No gas fees, just a lovely memento that lives in my wallet forever.',
    name: 'Sana Patel',
    role: 'Attendee & Collector'
  }
];

const features = [
  {
    iconSrc: '/images/icons/target.svg',
    iconAlt: 'Target representing simple setup',
    title: 'Simple Setup',
    description: 'Create events in minutes',
    background: '#FFF5C8',
    accent: '#FACC15'
  },
  {
    iconSrc: '/images/icons/mobile.svg',
    iconAlt: 'Mobile phone showing claim link',
    title: 'Easy Claims',
    description: 'QR codes & instant links',
    background: '#FFF9E6',
    accent: '#FBBF24'
  },
  {
    iconSrc: '/images/icons/lightning.svg',
    iconAlt: 'Lightning bolt for zero gas fees',
    title: 'Zero Gas Fees',
    description: 'Free minting for attendees',
    background: '#FDECF8',
    accent: '#F6AD55'
  },
  {
    iconSrc: '/images/icons/chain.svg',
    iconAlt: 'Chain links showing on-chain proof',
    title: 'On-Chain Proof',
    description: 'Permanent verification',
    background: '#FFF4DC',
    accent: '#EAB308'
  },
  {
    iconSrc: '/images/icons/analytics.svg',
    iconAlt: 'Analytics dashboard bars',
    title: 'Analytics',
    description: 'Track engagement & attendance',
    background: '#EDE7FF',
    accent: '#C084FC'
  },
  {
    iconSrc: '/images/icons/palette.svg',
    iconAlt: 'Palette representing custom design',
    title: 'Custom Design',
    description: 'Brand your POAPs',
    background: '#FFE7E0',
    accent: '#F97316'
  }
];

const logos = [
  { label: 'Community DAO', icon: '🌈' },
  { label: 'CreatorCon', icon: '🎨' },
  { label: 'MetaFest', icon: '🎉' },
  { label: 'DAO Camp', icon: '⛺️' },
  { label: 'Art Basel+', icon: '🖼️' },
  { label: 'SummitX', icon: '⛰️' }
];

const footerLinks = [
  { label: 'About', href: '/about' },
  { label: 'Docs', href: '/docs' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
];

const problemPoints = [
  {
    iconSrc: '/images/icons/problem-bots.svg',
    iconAlt: 'Bots bypassing check-ins illustration',
    title: 'Bot-Proof Attendance',
    description: 'Stop spam entries and verify real humans with on-chain logs.'
  },
  {
    iconSrc: '/images/icons/problem-checkins.svg',
    iconAlt: 'Manual check-in issues illustration',
    title: 'No More Manual Logs',
    description: 'Ditch paper lists and spreadsheets for a tamper-proof ledger.'
  },
  {
    iconSrc: '/images/icons/problem-forget.svg',
    iconAlt: 'Lost ticket stub illustration',
    title: 'Memories That Last',
    description: 'Give attendees a collectible keepsake they can’t misplace.'
  }
];

export default function ProofOfPresenceLanding() {
  const [counterValues, setCounterValues] = useState<number[]>(() => counterStats.map(() => 0));

  useEffect(() => {
    let frameId: number;
    const duration = 1600;
    const start = performance.now();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = easeOut(progress);
      setCounterValues(counterStats.map((stat) => Math.round(stat.value * eased)));
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const primaryButtonHandlers = createButtonLiftHandlers(primaryButtonRestShadow, primaryButtonHoverShadow);
  const secondaryButtonHandlers = createButtonLiftHandlers(secondaryButtonRestShadow, secondaryButtonHoverShadow);

  return (
    <div style={pageWrapper}>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        .hero-section {
          position: relative;
        }
        
        .hero-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url('/images/hero-section-main.png');
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
          opacity: 0.4;
          z-index: -2;
          pointer-events: none;
        }
        
        .hero-section::after {
          content: '';
          position: absolute;
          top: -50px;
          right: -50px;
          width: 300px;
          height: 300px;
          background-image: url('/images/section-elements.png');
          background-size: contain;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0.5;
          z-index: -1;
          pointer-events: none;
        }
        
        @media (max-width: 768px) {
          .two-column-section {
            grid-template-columns: 1fr !important;
          }
          
          .hero-section::after {
            width: 120px;
            height: 120px;
            top: -10px;
            right: -10px;
          }
        }
        
        @media (max-width: 480px) {
          h1 { font-size: 2.6rem !important; }
          img[alt="POAP All-in-One Concept"] { max-width: 360px !important; }
          
          .hero-section::after {
            display: none;
          }
        }
      `}</style>
      <main style={contentWrapper}>
        <section style={heroSection} className="hero-section">
          <span
            style={{
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              color: '#b45309',
            }}
          >
            Proof of Presence dApp
          </span>
          <h1 style={heroTitle}>Proof of Presence: POAP dApp</h1>
          <p style={heroSubtitle}>
            Generate unique digital mementos for your attendees with ease and prove verifiable attendance of your events.
          </p>
          <div style={buttonRow}>
            <Link href="/organizer" style={primaryButton} {...primaryButtonHandlers}>
              <span>Create Event</span>
              <span style={{ fontSize: '1.25rem' }}>→</span>
            </Link>
            <Link href="/claim" style={secondaryButton} {...secondaryButtonHandlers}>
              <span>Claim Your POAP</span>
              <span style={{ fontSize: '1.25rem' }}>→</span>
            </Link>
          </div>
          <img
            src="/images/hero_all_in_one.png"
            alt="POAP All-in-One Concept"
            style={heroImage}
          />
        </section>
        <div style={{
          textAlign: 'center',
          margin: '3rem 0',
          fontSize: '1.4rem',
          color: '#b45309',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem'
        }}>
          <span style={{ color: '#facc15', fontSize: '1.2rem' }}>✦</span>
          POAPs are bookmarks for your life
          <span style={{ color: '#facc15', fontSize: '1.2rem' }}>✦</span>
        </div>
        
        <section style={twoColumnSection} className="two-column-section">
          <div style={problemColumn}>
            <h2 style={columnHeading}>The Problem</h2>
            <p style={paragraph}>
              Events are meaningful, but memories fade. Wristbands break, ticket stubs get lost, and social posts can be faked.
              Traditional proof of attendance offers no verifiable way to show you were part of something special.
            </p>
            <div style={problemPointsWrapper}>
              {problemPoints.map((point) => (
                <div key={point.title} style={problemPointCard}>
                  <div style={problemPointIconWrap}>
                    <img src={point.iconSrc} alt={point.iconAlt} style={problemPointIcon} />
                  </div>
                  <h3 style={problemPointTitle}>{point.title}</h3>
                  <p style={problemPointDescription}>{point.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={solutionColumn}>
            <h2 style={columnHeading}>Our Solution</h2>
            <p style={paragraph}>
              Proof of Presence enables organizers to create verifiable NFT badges that attendees can claim in seconds. Each
              badge lives on-chain forever, giving your community bragging rights that can’t be forged or forgotten.
            </p>
            <img
              src="/images/random.png"
              alt="Event creation illustration"
              style={solutionImage}
            />
          </div>
        </section>

        <section>
          <h2 style={{ 
            fontSize: '2.5rem', 
            marginBottom: '2rem', 
            textAlign: 'center', 
            color: '#b45309',
            textShadow: '2px 2px 0px #ffffff, -2px -2px 0px #ffffff, 2px -2px 0px #ffffff, -2px 2px 0px #ffffff',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>HOW DOES POAP WORK?</h2>
          <div style={flowSection}>
            {flowSteps.map((step, index) => (
              <div key={step.title} style={flowCard}>
                <div style={flowNumber}>{index + 1}</div>
                <img src={step.image} alt={step.alt} style={flowImage} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#b45309' }}>{step.title}</h3>
                <p style={{ color: '#7c6d4f', lineHeight: 1.6 }}>{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={badgeGallerySection}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            textAlign: 'center'
          }}>
            <span style={{ color: '#a16207', letterSpacing: '0.2em', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Badge gallery
            </span>
            <h2 style={{
              fontSize: '2.1rem',
              color: '#b45309',
              margin: 0,
              textShadow: '2px 2px 0px #ffffff, -2px -2px 0px #ffffff'
            }}>
              Let attendees swipe through collectibles
            </h2>
            <p style={{ color: '#7c6d4f', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
              Showcase your latest POAP drops and let fans preview the artwork before they claim. Scroll sideways to peek at a few examples.
            </p>
          </div>
          <div style={galleryTrack}>
            {badgeExamples.map((badge) => (
              <div key={badge.title} style={galleryCard}>
                <img
                  src="/images/badge_gallery.png"
                  alt={`${badge.title} artwork`}
                  style={{
                    ...galleryImage,
                    filter: `hue-rotate(${badge.hue}) saturate(1.1)`
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <h3 style={{ fontSize: '1.25rem', color: '#b45309', margin: 0 }}>{badge.title}</h3>
                  <p style={{ color: '#7c6d4f', margin: 0, lineHeight: 1.5 }}>{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={galleryHint}>Swipe or drag to explore all badges ✨</div>
        </section>

        <section style={{ position: 'relative' }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '1rem',
            fontSize: '1.1rem',
            color: '#b45309',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem'
          }}>
            <span style={{ color: '#facc15', fontSize: '1.5rem' }}>⚡</span>
            Everything you need to succeed
            <span style={{ color: '#facc15', fontSize: '1.5rem' }}>⚡</span>
          </div>
          <h2 style={{ 
            fontSize: '2.2rem', 
            marginBottom: '2.5rem', 
            textAlign: 'center', 
            color: '#b45309',
            textShadow: '2px 2px 0px #ffffff, -2px -2px 0px #ffffff, 2px -2px 0px #ffffff, -2px 2px 0px #ffffff',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Why Organizers Love It
          </h2>
          <img
            src="/images/organizer_love.svg"
            alt="Organizer handing out POAP badges illustration"
            style={featuresImage}
          />
          <div style={featuresGrid}>
            {features.map((feature, index) => (
              <div 
                key={feature.title} 
                style={{
                  ...featureCardBase,
                  background: feature.background,
                  borderColor: feature.accent,
                  animationDelay: `${index * 0.1}s`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 18px 40px rgba(217, 119, 6, 0.28)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 32px rgba(250, 204, 21, 0.18)';
                }}
              >
                <div
                  style={{
                    ...featureIconWrapper,
                    background: feature.accent
                  }}
                >
                  <img src={feature.iconSrc} alt={feature.iconAlt} style={featureIconImage} />
                </div>
                <h3 style={{
                  ...featureTitle,
                  fontSize: '1.2rem',
                  marginBottom: '0.5rem'
                }}>
                  {feature.title}
                </h3>
                <p style={featureDescription}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section style={socialProofSection}>
          <img
            src="/images/community_trust.svg"
            alt="Community holding POAP badges illustration"
            style={socialProofIllustration}
          />
          <h2 style={{ 
            fontSize: '1.9rem', 
            textAlign: 'center', 
            color: '#b45309',
            textShadow: '1px 1px 0px #ffffff, -1px -1px 0px #ffffff, 1px -1px 0px #ffffff, -1px 1px 0px #ffffff',
            fontWeight: 700
          }}>
            Trusted by communities, conferences, and creators worldwide.
          </h2>
          <div style={tickerViewport}>
            <div style={tickerTrack}>
              {[...logos, ...logos].map((logo, index) => (
                <div key={`${logo.label}-${index}`} style={logoPill}>
                  <span style={{ fontSize: '1.4rem' }}>{logo.icon}</span>
                  {logo.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={counterSection}>
          <div style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <span style={{ color: '#a16207', letterSpacing: '0.2em', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Community momentum
            </span>
            <h2 style={{ fontSize: '2.1rem', color: '#b45309', margin: 0, textShadow: '2px 2px 0px #ffffff, -2px -2px 0px #ffffff' }}>
              Proof that organizers and attendees show up
            </h2>
          </div>
          <div style={counterGrid}>
            {counterStats.map((stat, index) => (
              <div key={stat.label} style={counterCard}>
                <span style={counterEmoji}>{stat.emoji}</span>
                <div style={counterNumber}>
                  {counterValues[index].toLocaleString()}
                  {index !== 2 ? '+' : ''}
                </div>
                <span style={counterLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={testimonialSection}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            textAlign: 'center'
          }}>
            <span style={{ color: '#a16207', letterSpacing: '0.2em', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Testimonials
            </span>
            <h2 style={{ fontSize: '2.1rem', color: '#b45309', margin: 0, textShadow: '2px 2px 0px #ffffff, -2px -2px 0px #ffffff' }}>
              Loved by organizers and attendees alike
            </h2>
          </div>
          <div style={testimonialGrid}>
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} style={testimonialCard}>
                <span style={{ fontSize: '2rem' }}>“</span>
                <p style={testimonialQuote}>{testimonial.quote}</p>
                <div style={testimonialAuthor}>
                  <span>{testimonial.name}</span>
                  <span style={{ fontWeight: 400, color: '#7c6d4f' }}>{testimonial.role}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={bannerCTA}>
          <img
            src="/images/hero_all_in_one.png"
            alt="POAP Call to Action"
            style={ctaImage}
          />
          <h2 style={{ fontSize: '2.25rem', lineHeight: 1.2, color: '#5b4334' }}>
            Turn every event into a lasting memory.
          </h2>
          <p style={{ maxWidth: '620px', lineHeight: 1.7, color: '#7c6d4f' }}>
            Launch your first Proof of Presence drop in minutes, or browse upcoming events to start your collection of digital
            souvenirs.
          </p>
          <div style={buttonRow}>
            <Link
              href="/organizer"
              style={{
                ...primaryButton,
                background: '#fde047',
                color: '#92400e',
                border: '2px solid #fde047',
                boxShadow: primaryButtonRestShadow,
              }}
              {...primaryButtonHandlers}
            >
              <span>Create Your First POAP</span>
              <span style={{ fontSize: '1.25rem' }}>→</span>
            </Link>
            <Link
              href="/events"
              style={{ 
                ...secondaryButton, 
                borderColor: '#facc15', 
                color: '#a16207',
                border: '2px solid #facc15',
                boxShadow: secondaryButtonRestShadow
              }}
              {...secondaryButtonHandlers}
            >
              <span>Explore Events</span>
              <span style={{ fontSize: '1.25rem' }}>→</span>
            </Link>
          </div>
        </section>
      </main>

      <footer style={footer}>
        <div style={footerInner}>
          <div>© {new Date().getFullYear()} Proof of Presence. All rights reserved.</div>
          <nav style={navLinksRow}>
            {footerLinks.map((link) => (
              <Link key={link.label} href={link.href} style={navLink}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}