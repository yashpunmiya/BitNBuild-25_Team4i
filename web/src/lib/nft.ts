const METADATA_NAME_LIMIT = 32;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const truncateUtf8 = (input: string, maxBytes: number): string => {
  const bytes = encoder.encode(input);
  if (bytes.length <= maxBytes) {
    return input;
  }

  let truncated = bytes.slice(0, maxBytes);
  while (truncated.length > 0) {
    const lastByte = truncated[truncated.length - 1];
    if ((lastByte & 0b1100_0000) !== 0b1000_0000) {
      break;
    }
    truncated = truncated.slice(0, -1);
  }

  if (truncated.length === 0) {
    return '';
  }

  return decoder.decode(truncated);
};

export const getCollectionName = (eventName: string): string =>
  truncateUtf8(eventName, METADATA_NAME_LIMIT);

export const getClaimNftName = (eventName: string): string =>
  truncateUtf8(`${eventName} Proof of Presence`, METADATA_NAME_LIMIT);
