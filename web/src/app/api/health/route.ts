import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PublicKey } from '@solana/web3.js';

import { getServerConfig } from '@/lib/env';
import { getFeePayer, getCollectionAuthority } from '@/lib/umi';

export async function GET(): Promise<NextResponse> {
  try {
    const config = getServerConfig();
    
    // Test Supabase connection
    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error: dbError } = await supabase
      .from('events')
      .select('count')
      .limit(1);

    // Test wallet configuration
    let feePayerPubkey = 'ERROR';
    let collectionAuthorityPubkey = 'ERROR';
    let walletError = null;
    
    try {
      const feePayer = getFeePayer();
      const collectionAuthority = getCollectionAuthority();
      
      // Get public keys for display
      feePayerPubkey = new PublicKey(feePayer.publicKey).toBase58();
      collectionAuthorityPubkey = new PublicKey(collectionAuthority.publicKey).toBase58();
    } catch (error) {
      walletError = error instanceof Error ? error.message : 'Unknown wallet error';
    }

    return NextResponse.json({
      status: 'healthy',
      checks: {
        supabase: {
          connected: !dbError,
          error: dbError?.message || null,
        },
        wallets: {
          feePayer: feePayerPubkey,
          collectionAuthority: collectionAuthorityPubkey,
          error: walletError,
        },
        config: {
          rpcUrl: config.SOLANA_RPC_URL,
          bundlrUrl: config.BUNDLR_RPC_URL,
          hasEnvVars: {
            supabaseUrl: !!config.SUPABASE_URL,
            supabaseKey: !!config.SUPABASE_SERVICE_ROLE_KEY,
            feePayerKey: !!config.SOLANA_FEE_PAYER,
            collectionAuthorityKey: !!config.COLLECTION_AUTHORITY,
          },
        },
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}