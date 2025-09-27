import { Buffer } from 'buffer';
import { createGenericFile, type Umi } from '@metaplex-foundation/umi';

import { getServerConfig } from './env';
import { getUmi } from './umi';

const EXT_QUERY_REGEX = /[?&]ext=/i;

const mapBundlrUri = (uri: string): string => {
  const config = getServerConfig();

  if (
    config.BUNDLR_RPC_URL.includes('devnet') &&
    uri.startsWith('https://arweave.net/')
  ) {
    return uri.replace('https://arweave.net/', 'https://devnet.irys.xyz/');
  }

  return uri;
};

const getExtensionFromContentType = (contentType: string): string | null => {
  const normalized = contentType.toLowerCase();

  if (normalized === 'application/json') {
    return 'json';
  }

  if (normalized.startsWith('image/')) {
    const [, subtype] = normalized.split('/');
    if (subtype) {
      if (subtype === 'jpeg') {
        return 'jpg';
      }
      return subtype;
    }
  }

  return null;
};

const normalizeUri = (uri: string, contentType: string): string => {
  const normalized = mapBundlrUri(uri);

  if (EXT_QUERY_REGEX.test(normalized)) {
    return normalized;
  }

  const extension = getExtensionFromContentType(contentType);
  if (!extension) {
    return normalized;
  }

  const separator = normalized.includes('?') ? '&' : '?';
  return `${normalized}${separator}ext=${extension}`;
};

const ensureUint8Array = (buffer: Buffer): Uint8Array => new Uint8Array(buffer);

const uploadBuffer = async (
  buffer: Buffer,
  fileName: string,
  contentType: string,
  umi: Umi,
): Promise<string> => {
  const file = createGenericFile(ensureUint8Array(buffer), fileName, {
    contentType,
  });

  const [uri] = await umi.uploader.upload([file]);
  return normalizeUri(uri, contentType);
};

export const uploadImage = async (
  buffer: Buffer,
  contentType: string,
  fileName = 'snapshot.png',
): Promise<string> => {
  const umi = getUmi();
  return uploadBuffer(buffer, fileName, contentType, umi);
};

export const uploadMetadata = async <T extends Record<string, unknown>>(
  payload: T,
  fileName = 'metadata.json',
): Promise<string> => {
  const umi = getUmi();
  const jsonBuffer = Buffer.from(JSON.stringify(payload));
  return uploadBuffer(jsonBuffer, fileName, 'application/json', umi);
};

