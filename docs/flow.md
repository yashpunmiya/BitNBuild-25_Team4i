# Proof of Presence Flow Guide

This document captures the complete organizer → visitor experience for the Proof of Presence dApp. It highlights every moving piece (UI, APIs, Supabase, Bundlr, and Solana) and explains how data flows between them. Use it as a walkthrough when onboarding teammates or debugging the production path.

---

## 1. High-Level Overview

1. **Organizer onboarding**
   - Organizer creates an event in the dashboard.
   - The backend mints a collection NFT on Solana and stores the event in Supabase.
   - Organizer can either generate individual claim codes **or** share a dynamic QR that allocates the next unused code on demand.
2. **Visitor claim**
   - Visitor scans or visits a claim link, connects a wallet, and captures a snapshot.
   - Snapshot + metadata are uploaded to Bundlr (Arweave devnet gateway).
   - Server builds a pre-funded mint transaction, the visitor signs, and the backend finalizes on Solana.
   - Supabase marks the code as claimed and stores the transaction signature.

---

## 2. Detailed Flowchart

```mermaid
flowchart TD
   subgraph Organizer Journey
        A0[Organizer UI
        /organizer] --> A1[POST /api/events/create]
        A1 -->|Mint collection| A2[Solana createCollectionNft]
        A2 -->|Upload empty metadata| A3[Bundlr devnet gateway]
        A2 -->|Mint collection NFT| A4[Solana RPC]
        A1 -->|Persist event| A5[Supabase events]
      A5 --> B0[POST /api/claim-codes/generate]
      A5 --> B3[Organizer copies dynamic QR
      /claim/dynamic?event=:id]
    end

    subgraph Claim Code Prep
        B0 -->|Insert codes
        (fallback column detection)| B1[Supabase claims]
        B1 -->|Return codes| B2[Organizer UI displays QR/links]
    end

   subgraph Dynamic Allocation
      B3 --> D2[GET /claim/dynamic]
      D2 -->|Release stale reservations
      & lock next unused code| B1
      D2 -->|Redirect with fresh code| C0
   end

    subgraph Visitor Journey
        C0[Visitor Claim Page
        /claim/:code] --> C1[GET /api/claim/:code]
        C1 -->|Load event + status| C0
        C0 -->|Capture photo| C2[Browser Camera]
        C0 -->|Upload snapshot| C3[POST /api/metadata/create]
        C3 -->|Store image/json| C4[Bundlr devnet gateway]
        C3 -->|Cache URIs| C0
        C0 -->|Request mint| C5[POST /api/claim/build]
        C5 -->|Create NFT instructions| C6[Solana buildClaimTransaction]
        C6 -->|Fee payer signer + collection verify| A4
        C5 -->|Reserve claim, return tx| C0
        C0 -->|Wallet signs versioned tx| C7[Visitor Wallet]
        C7 -->|Submit signed tx| C8[POST /api/claim/finalize]
        C8 -->|Send with fee payer| A4
        C8 -->|Update status & txSig| B1
        C8 -->|Return signature| C0
    end

    A4 -->|Confirmed mint| D0[Minted POP NFT]
    B1 -->|Analytics/Exports| D1[Organizer Reports]
```

### Key Callouts
- **Bundlr Gateway Mapping**: Uploads use `https://devnet.irys.xyz/…?ext=png|json`, ensuring wallets can resolve metadata while staying on devnet.
- **Fee Payer Coverage**: The backend fee payer signs every builder/finalize transaction, keeping visitor wallets gasless.
- **Metaplex Limits**: Collection and claim names are UTF-8 truncated to 32 bytes to avoid `NameTooLong` errors while preserving full titles in metadata traits.

---

## 3. Step-by-Step Breakdown

### Organizer Dashboard
1. **Create Event**
   - Form POSTs to `/api/events/create`.
   - Server mints a collection NFT (`createCollectionNft`), uploading placeholder metadata to Bundlr.
   - Event record stored in Supabase with collection mint and timestamps.
2. **Distribute Claim Links**
   - `/api/claim-codes/generate` inserts `count` UUID codes.
   - API auto-detects the correct `event_id` casing to match Supabase schema variants.
   - Codes surface in the dashboard for manual sharing.
   - Alternatively, organizers share the **Dynamic Claim QR** (encodes `/claim/dynamic?event=:id`). Each scan calls `/api/claim/next`/`GET /claim/dynamic`, which marks the next available claim as reserved and redirects the visitor to `/claim/:code`.

### Visitor Claim Experience
1. **Load Claim Page**
   - Visitors arrive via a direct code or the dynamic QR redirect.
   - `GET /api/claim/:code` returns event details and status.
   - Page displays wallet connect and camera controls.
2. **Capture Proof**
   - Snapshot captured locally; when submitting, `/api/metadata/create` uploads the image + metadata JSON to Bundlr.
   - Response caches `imageUri` and `metadataUri` for immediate preview.
3. **Build Transaction**
   - `/api/claim/build` verifies claim availability, reserves it, and constructs a versioned transaction that mints an NFT into the visitor wallet.
   - Collection verification picks `setAndVerifySizedCollectionItem` if the collection has size metadata; otherwise uses the standard instruction.
4. **Sign & Finalize**
   - Wallet signs the builder transaction without paying fees.
   - `/api/claim/finalize` submits the signed transaction using the organizer fee payer and marks the claim as `claimed` with the on-chain signature.

---

## 4. Operational Notes

- **Supabase Service Role Keys**: API routes rely on server-side service keys. Never expose them to the client.
- **Bundlr Funding**: Ensure the configured fee payer wallet maintains enough balance on devnet Bundlr; uploads will fail silently otherwise.
- **Reservation TTL**: Each dynamic allocation marks a claim as `reserved` for ~10 minutes. Stale reservations are automatically released on the next allocation attempt so the pool recycles naturally.
- **Environment Coordination**:
  - `SOLANA_FEE_PAYER` and `COLLECTION_AUTHORITY` must be Base58 keypairs with devnet SOL.
  - `BUNDLR_RPC_URL` determines the gateway rewrite (`devnet` → `https://devnet.irys.xyz`).
  - `NEXT_PUBLIC_BASE_URL` allows metadata to surface a functional `external_url`.

---

## 5. Next Suggested Enhancements

1. **Dynamic QR Metrics**: Show remaining/claimed counts in real time so organizers know when the pool runs low.
2. **On-Chain Verification**: Add a public endpoint that confirms a wallet holds a valid Proof of Presence NFT (verified via Metaplex metadata).
3. **Mainnet Readiness**: Swap Bundlr and RPC URLs to mainnet-beta, add wallet gating for organizers, and update gateway logic accordingly.
4. **Automated Testing**: Introduce Playwright or Cypress flows that simulate organizer and visitor journeys to catch regressions early.
5. **Progressive Uploads**: Consider compressing snapshots client-side before upload to reduce Bundlr fees.

---

_Updated: September 27, 2025_
