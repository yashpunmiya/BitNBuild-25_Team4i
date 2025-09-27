import { z } from 'zod';

const serverSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SOLANA_RPC_URL: z.string().url(),
  SOLANA_FEE_PAYER: z.string().min(1),
  COLLECTION_AUTHORITY: z.string().min(1),
  BUNDLR_RPC_URL: z.string().url(),
  BUNDLR_PROVIDER_URL: z.string().url().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SOLANA_RPC_URL: z.string().url(),
});

export type ServerConfig = z.infer<typeof serverSchema>;
export type ClientConfig = z.infer<typeof clientSchema>;

let serverConfig: ServerConfig | undefined;
let clientConfig: ClientConfig | undefined;

export const getServerConfig = (): ServerConfig => {
  if (!serverConfig) {
    serverConfig = serverSchema.parse({
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      SOLANA_RPC_URL: process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
      SOLANA_FEE_PAYER: process.env.SOLANA_FEE_PAYER,
      COLLECTION_AUTHORITY: process.env.COLLECTION_AUTHORITY,
      BUNDLR_RPC_URL: process.env.BUNDLR_RPC_URL,
      BUNDLR_PROVIDER_URL: process.env.BUNDLR_PROVIDER_URL,
    });
  }

  return serverConfig;
};

export const getClientConfig = (): ClientConfig => {
  if (!clientConfig) {
    clientConfig = clientSchema.parse({
      NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    });
  }

  return clientConfig;
};

