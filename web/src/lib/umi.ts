import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  type KeypairSigner,
  createSignerFromKeypair,
  type Signer,
  Umi,
  signerIdentity,
} from '@metaplex-foundation/umi';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { bundlrUploader } from '@metaplex-foundation/umi-uploader-bundlr';
import bs58 from 'bs58';

import { getServerConfig } from './env';

let umiSingleton: Umi | undefined;
let feePayerSigner: Signer | undefined;
let collectionAuthoritySigner: KeypairSigner | undefined;

// Reset singletons during development
if (process.env.NODE_ENV === 'development') {
  umiSingleton = undefined;
}

const loadKeypair = (encoded: string, umi: Umi): KeypairSigner => {
  const secretKey = bs58.decode(encoded);
  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  return createSignerFromKeypair(umi, keypair);
};

export const getUmi = (): Umi => {
  if (!umiSingleton) {
    const config = getServerConfig();
    umiSingleton = createUmi(config.SOLANA_RPC_URL)
      .use(mplTokenMetadata())
      .use(
        bundlrUploader({
          address: config.BUNDLR_RPC_URL,
          providerUrl: config.BUNDLR_PROVIDER_URL ?? config.SOLANA_RPC_URL,
        }),
      );
    
    // Set the fee payer as the default signer identity
    const feePayer = loadKeypair(config.SOLANA_FEE_PAYER, umiSingleton);
    umiSingleton = umiSingleton.use(signerIdentity(feePayer));
  }

  return umiSingleton;
};

export const getFeePayer = (): Signer => {
  if (!feePayerSigner) {
    const config = getServerConfig();
    const umi = getUmi();
    feePayerSigner = loadKeypair(config.SOLANA_FEE_PAYER, umi);
  }

  return feePayerSigner;
};

export const getCollectionAuthority = (): KeypairSigner => {
  if (!collectionAuthoritySigner) {
    const config = getServerConfig();
    const umi = getUmi();
    collectionAuthoritySigner = loadKeypair(config.COLLECTION_AUTHORITY, umi);
  }

  return collectionAuthoritySigner;
};

