Goal

A Proof of Presence dApp on Solana testnet

Each event has a Collection NFT (1 per event).

Visitors scan a QR → open claim page → capture a photo → backend uploads to IPFS (NFT.Storage) → backend mints NFT into the visitor’s wallet.

The NFT is verified under the event’s Collection, so wallets/explorers group them.

Tech Stack

Framework: Next.js (TypeScript)

Wallets: @solana/wallet-adapter
Docs: https://github.com/anza-xyz/wallet-adapter/blob/master/APP.md

Blockchain SDK: Metaplex Umi + mpl-token-metadata
Docs: https://developers.metaplex.com/token-metadata/getting-started/js

Storage: NFT.Storage (free IPFS uploads)
Docs: https://dev.nft.storage/docs/

Gasless UX: Organizer wallet = fee payer
Docs: https://solanacookbook.com/core-concepts/transactions.html

Database: Supabase (for events + claim codes)

Camera: Browser API (navigator.mediaDevices.getUserMedia)
Docs: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

What to Create
1. /lib/umi.ts

Utility to init Umi with RPC + Token Metadata plugin.

2. API Routes
/api/events/create

Input: { name, description }.

Action: Mint a Collection NFT (isCollection: true) with Token Metadata.

Save collectionMint + event info in DB.

Output: { collectionMint }.

/api/claim/build

Input: { code, owner, metadataUri }.

Validate code unused → mark reserved.

Create a new NFT with metadataUri + set collection = collectionMint.

Build VersionedTransaction with feePayer = organizer wallet.

Partially sign (collection authority + mint authority), return base64 tx to client.

/api/claim/finalize

Input: { code, signedTx }.

Add feePayer signature, broadcast.

Mark code as claimed in DB.

Return { signature }.

/api/metadata/create

Input: { code, imageDataUrl }.

Decode base64 PNG → upload to NFT.Storage.

Create metadata JSON (name, description, image).

Upload JSON to NFT.Storage.

Return { metadataUri }.

3. Pages
/claim/[code]

Load event by claim code.

Prompt user to connect wallet (wallet-adapter UI).

Start camera (getUserMedia), capture snapshot.

POST snapshot → /api/metadata/create.

Call /api/claim/build → get tx → sign with wallet.

Send back to /api/claim/finalize → mint confirmed.

Show success + explorer link.

Data Models

events

id (uuid)

name (string)

description (string)

collectionMint (string)

createdAt

claims

id (uuid)

eventId (fk)

code (uuid/string)

status enum(unused, reserved, claimed)

wallet (string)

txSig (string)

Flow Summary

Organizer creates event → Collection NFT minted.

Generate QR links with code.

Visitor scans → claim page → connect wallet → capture photo.

Photo → IPFS → metadataUri.

Backend builds mint tx with collection set.

Visitor signs → server adds fee-payer sig → broadcast.

Visitor NFT now verified under event’s collection.