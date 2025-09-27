export type FrameSelfieConfig = {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
};

export type FrameConfig = {
  selfie: FrameSelfieConfig;
};

export const parseFrameConfig = (value: unknown): FrameConfig | null => {
  if (!value) {
    return null;
  }

  try {
    const source = typeof value === 'string' ? JSON.parse(value) : value;
    if (!source || typeof source !== 'object') {
      return null;
    }

    const selfie = (source as { selfie?: unknown }).selfie;
    if (!selfie || typeof selfie !== 'object') {
      return null;
    }

    const { x, y, width, height, borderRadius } = selfie as Record<string, unknown>;

    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      typeof width !== 'number' ||
      typeof height !== 'number'
    ) {
      return null;
    }

    const normalized: FrameSelfieConfig = {
      x,
      y,
      width,
      height,
    };

    if (typeof borderRadius === 'number' && borderRadius >= 0) {
      normalized.borderRadius = borderRadius;
    }

    return { selfie: normalized };
  } catch (error) {
    console.error('Failed to parse frame config', error);
    return null;
  }
};

export const serializeFrameConfig = (config: FrameConfig | null | undefined): string | null => {
  if (!config) {
    return null;
  }

  return JSON.stringify(config);
};
