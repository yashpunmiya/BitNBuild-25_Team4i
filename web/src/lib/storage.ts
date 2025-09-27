import { Buffer } from 'buffer';
import { createGenericFileFromBuffer, type Umi } from '@metaplex-foundation/umi';

import { getUmi } from './umi';

const ensureUint8Array = (buffer: Buffer): Uint8Array => new Uint8Array(buffer);

const uploadBuffer = async (
  buffer: Buffer,
  fileName: string,
  contentType: string,
  umi: Umi,
): Promise<string> => {
  const file = createGenericFileFromBuffer(ensureUint8Array(buffer), fileName, {
    contentType,
  });

  const { uri } = await umi.uploader.upload(file);
  return uri;
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

