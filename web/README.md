# Proof of Presence dApp

A Next.js application for minting Proof of Presence NFTs on Solana. Visitors scan a claim QR code, capture a snapshot, and mint an NFT that is verified under an event collection. Assets and metadata are uploaded to Arweave through Bundlr and transactions are co-signed by the event organizer for a gasless UX.

## Features

- Event collection minting via Metaplex Umi + mpl-token-metadata
- Bundlr uploads for snapshot images and JSON metadata
- Supabase-backed events and claim codes with reservation + finalize flow
- Solana Wallet Adapter UI for in-browser signing
- Versioned transactions with organizer fee payer signature on finalize
- Camera capture with live preview and retake flow
- Public verification portal for claim codes, wallets, or transaction signatures

## Prerequisites

- Node.js 20+
- npm 10+
- Solana CLI 1.18+
- Anchor CLI 0.30+ (for the on-chain program)
- Supabase project with `events` and `claims` tables (see schema below)
- Bundlr/Irys wallet funded with SOL or USDC

### Supabase schema

```sql
create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  collectionMint text not null,
  createdAt timestamptz not null default now()
);

create type claim_status as enum ('unused', 'reserved', 'claimed');

create table claims (
  id uuid primary key default gen_random_uuid(),
  eventId uuid references events(id) on delete cascade,
  code text unique not null,
  status claim_status not null default 'unused',
  wallet text,
  txSig text,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);
```

## Environment variables

Create a `.env.local` in `web/` with:

```
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_RPC_URL=https://api.devnet.solana.com
SUPABASE_URL=<supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role>
SOLANA_FEE_PAYER=<base58-secret-key>
COLLECTION_AUTHORITY=<base58-secret-key>
BUNDLR_RPC_URL=https://devnet.bundlr.network
BUNDLR_PROVIDER_URL=https://api.devnet.solana.com
```

- `SOLANA_FEE_PAYER`: organizer wallet paying transaction fees.
- `COLLECTION_AUTHORITY`: signer that owns the event collection and can set collections.
- Both secrets are base58-encoded 64-byte secret keys.

## Install & run

```bash
cd web
npm install
npm run lint
npm run dev
```

Visit `http://localhost:3000` for the landing page, and `http://localhost:3000/claim/<code>` for individual claims.

## API summary

| Method | Route                     | Purpose |
| ------ | ------------------------- | ------- |
| POST   | `/api/events/create`      | Mint an event collection NFT and persist event metadata |
| POST   | `/api/metadata/create`    | Upload snapshot + metadata JSON to Bundlr |
| POST   | `/api/claim/build`        | Reserve claim code and return partially signed versioned tx |
| POST   | `/api/claim/finalize`     | Add fee payer signature, broadcast, and mark claim as claimed |
| GET    | `/api/claim/[code]`       | Lookup claim status and related event |
| POST   | `/api/verify`             | Verify minted proofs by claim code, wallet address, or transaction signature |

## Client flow

1. Visitor opens `/claim/[code]`.
2. Connect wallet with provided UI (organizer wallet will co-sign later).
3. Capture snapshot with camera → `/api/metadata/create` uploads to Arweave.
4. `/api/claim/build` reserves claim, builds versioned transaction, and signs with mint + collection authority.
5. Wallet signs the partially signed transaction (0-lamport self-transfer enforces signature).
6. `/api/claim/finalize` adds organizer fee-payer signature, sends the transaction, and marks claim as claimed.

## End-to-end checklist

1. **Fund Bundlr** – Use the fee payer keypair on devnet Bundlr (`https://devnet.bundlr.network`) so uploads succeed.
2. **Create event** – From `/organizer`, submit name + description. The server mints a collection NFT and stores the event in Supabase.
3. **Generate claim codes** – Select the event and request 1–100 codes. The API inserts rows into `claims` and returns the generated codes for download/testing.
4. **Distribute codes** – Turn each code into a QR that points to `/claim/<code>`.
5. **Visitor claim** – Attendee hits the claim URL, signs in with a wallet, snaps a picture, and triggers `/api/claim/build`.
6. **Finalize mint** – The visitor signs the partially signed transaction, then `/api/claim/finalize` adds the fee payer signature and broadcasts.
7. **Verify** – Supabase marks the claim `claimed`, storing the wallet and signature for audit.

## Anchor deployment cheatsheet

These commands assume your Anchor program lives alongside this repo (adjust paths as needed).

```bash
# 1. Initialise a new Anchor workspace for the on-chain program
anchor init pop-presence --javascript

# 2. Switch into the program directory
cd pop-presence

# 3. Configure Solana RPC for your target cluster (devnet recommended during hackathon)
solana config set --url https://api.devnet.solana.com

# 4. Build the program to produce the deployment artifacts
anchor build

# 5. Review generated program addresses
anchor keys list

# 6. Deploy to the selected cluster
anchor deploy

# 7. (Optional) Run Anchor tests against the deployed program
anchor test

# 8. Publish updated IDL if the client needs it
anchor idl init <PROGRAM_ID> target/idl/pop_presence.json --provider.cluster devnet
```

> Tip: copy the program ID generated in step 5 into your application configuration if the client expects to interact with it. Keep the program keypair safe; redeploying with a new keypair changes the program ID.

## Next steps

- Wire claim code provisioning (seed `claims` table with event-specific codes).
- Implement organizer dashboard for event + claim analytics.
- Integrate Anchor program calls where needed (e.g., for custom validation or on-chain state).
- Add automated Supabase RLS policies before going to production.
