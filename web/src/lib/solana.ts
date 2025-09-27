import { Buffer } from 'buffer';
import { PublicKey as Web3PublicKey, SystemProgram } from '@solana/web3.js';
import {
  createNft,
  findMasterEditionPda,
  findMetadataPda,
  setAndVerifyCollection,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  generateSigner,
  percentAmount,
  publicKey,
  signTransaction,
  transactionBuilder,
} from '@metaplex-foundation/umi';
import bs58 from 'bs58';

import type { EventRow } from './supabase';
import { uploadMetadata } from './storage';
import { getCollectionAuthority, getFeePayer, getUmi } from './umi';

export type CreateCollectionInput = {
  name: string;
  description: string;
};

export type CreateCollectionResult = {
  collectionMint: string;
  metadataUri: string;
  signature: string;
};

export const createCollectionNft = async (
  input: CreateCollectionInput,
): Promise<CreateCollectionResult> => {
  const umi = getUmi();
  const collectionAuthority = getCollectionAuthority();
  const feePayer = getFeePayer();
  const mint = generateSigner(umi);

  const metadataUri = await uploadMetadata(
    {
      name: input.name,
      symbol: 'POP',
      description: input.description,
      image: '',
      attributes: [],
    },
    `collection-${mint.publicKey}.json`,
  );

  let builder = createNft(umi, {
    mint,
    authority: collectionAuthority,
    payer: feePayer,
    updateAuthority: collectionAuthority.publicKey,
    name: input.name,
    symbol: 'POP',
    uri: metadataUri,
    sellerFeeBasisPoints: percentAmount(0),
    isCollection: true,
    collectionDetails: { __kind: 'V1', size: 0 },
  }).setFeePayer(feePayer);

  const latestBlockhash = await umi.rpc.getLatestBlockhash();
  builder = builder.setBlockhash(latestBlockhash);
  const transaction = await builder.buildAndSign(umi);
  const signature = await umi.rpc.sendTransaction(transaction);
  await umi.rpc.confirmTransaction(signature, {
    strategy: {
      type: 'blockhash',
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
  });

  return {
    collectionMint: String(mint.publicKey),
    metadataUri,
    signature: bs58.encode(signature),
  };
};

export type BuildClaimTransactionInput = {
  event: EventRow;
  owner: string;
  metadataUri: string;
};

export type BuildClaimTransactionResult = {
  transaction: string;
  mint: string;
  blockhash: string;
  lastValidBlockHeight: number;
};

const createOwnerValidationInstruction = (
  owner: Web3PublicKey,
): ReturnType<typeof transactionBuilder> => {
  const ix = SystemProgram.transfer({
    fromPubkey: owner,
    toPubkey: owner,
    lamports: 0,
  });

  return transactionBuilder([
    {
      instruction: {
        programId: publicKey(ix.programId.toBase58()),
        accounts: ix.keys.map(({ pubkey: key, isSigner, isWritable }) => ({
          pubkey: publicKey(key.toBase58()),
          isSigner,
          isWritable,
        })),
        data: ix.data,
      },
      signers: [],
      bytesCreatedOnChain: 0,
    },
  ]);
};

export const buildClaimTransaction = async (
  params: BuildClaimTransactionInput,
): Promise<BuildClaimTransactionResult> => {
  const umi = getUmi();
  const collectionAuthority = getCollectionAuthority();
  const feePayer = getFeePayer();
  const mint = generateSigner(umi);

  const ownerPublicKey = new Web3PublicKey(params.owner);
  const ownerUmiPublicKey = publicKey(ownerPublicKey.toBase58());
  const collectionMintPublicKey = publicKey(params.event.collectionMint);

  let builder = createNft(umi, {
    mint,
    authority: collectionAuthority,
    payer: feePayer,
    updateAuthority: collectionAuthority.publicKey,
    name: `${params.event.name} Proof of Presence`,
    symbol: 'POP',
    uri: params.metadataUri,
    sellerFeeBasisPoints: percentAmount(0),
    tokenOwner: ownerUmiPublicKey,
    creators: [
      {
        address: collectionAuthority.publicKey,
        verified: true,
        share: 100,
      },
    ],
    collection: { key: collectionMintPublicKey, verified: false },
  });

  const [assetMetadata] = findMetadataPda(umi, { mint: mint.publicKey });
  const [collectionMetadata] = findMetadataPda(umi, { mint: collectionMintPublicKey });
  const [collectionMasterEdition] = findMasterEditionPda(umi, {
    mint: collectionMintPublicKey,
  });

  builder = builder.append(
    setAndVerifyCollection(umi, {
      metadata: assetMetadata,
      collectionAuthority,
      payer: feePayer,
      updateAuthority: collectionAuthority.publicKey,
      collectionMint: collectionMintPublicKey,
      collection: collectionMetadata,
      collectionMasterEditionAccount: collectionMasterEdition,
    }),
  );

  builder = builder.append(createOwnerValidationInstruction(ownerPublicKey));

  builder = builder.setFeePayer(feePayer).setVersion(0);
  const latestBlockhash = await umi.rpc.getLatestBlockhash();
  builder = builder.setBlockhash(latestBlockhash);

  const transaction = builder.build(umi);
  const partiallySigned = await signTransaction(transaction, [
    mint,
    collectionAuthority,
  ]);
  const serialized = umi.transactions.serialize(partiallySigned);
  const base64 = Buffer.from(serialized).toString('base64');

  return {
    transaction: base64,
    mint: String(mint.publicKey),
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  };
};

export const finalizeClaimTransaction = async (
  serializedTransaction: string,
): Promise<string> => {
  const umi = getUmi();
  const feePayer = getFeePayer();
  const raw = Buffer.from(serializedTransaction, 'base64');
  const transaction = umi.transactions.deserialize(raw);
  const signed = await signTransaction(transaction, [feePayer]);
  const signature = await umi.rpc.sendTransaction(signed);
  return bs58.encode(signature);
};
