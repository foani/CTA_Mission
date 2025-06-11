import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from '@web3auth/base';
import { Web3AuthConfig, ChainConfig, OAuthProvider } from '../types/web3auth';

// Catena Network Configuration
export const CATENA_CHAIN_CONFIG: ChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: '0x3E8', // 1000 in hex
  rpcTarget: import.meta.env.VITE_CATENA_RPC_URL || 'https://cvm.node.creatachain.com',
  displayName: 'Catena Network',
  blockExplorer: import.meta.env.VITE_CATENA_EXPLORER_URL || 'https://catena.explorer.creatachain.com',
  ticker: 'CTA',
  tickerName: 'Catena Token',
};

// Web3Auth Main Configuration
export const WEB3AUTH_CONFIG: Web3AuthConfig = {
  clientId: import.meta.env.VITE_WEB3AUTH_CLIENT_ID || '',
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET, // For development
  chainConfig: CATENA_CHAIN_CONFIG,
};

// OAuth Providers Configuration
export const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
  google: {
    name: 'google',
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    verifier: 'cta-mission-google',
  },
  apple: {
    name: 'apple',
    clientId: import.meta.env.VITE_APPLE_CLIENT_ID || '',
    verifier: 'cta-mission-apple',
  },
  kakao: {
    name: 'kakao',
    clientId: import.meta.env.VITE_KAKAO_CLIENT_ID || '',
    verifier: 'cta-mission-kakao',
  },
};

// Web3Auth Network Configuration for different environments
export const getWeb3AuthNetwork = (): WEB3AUTH_NETWORK => {
  const env = import.meta.env.VITE_NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return WEB3AUTH_NETWORK.SAPPHIRE_MAINNET;
    case 'staging':
      return WEB3AUTH_NETWORK.SAPPHIRE_DEVNET;
    default:
      return WEB3AUTH_NETWORK.SAPPHIRE_DEVNET;
  }
};

// Validation function for environment variables
export const validateWeb3AuthConfig = (): boolean => {
  const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID;
  
  if (!clientId) {
    console.error('Web3Auth Client ID is not configured');
    return false;
  }
  
  if (!import.meta.env.VITE_CATENA_RPC_URL) {
    console.error('Catena RPC URL is not configured');
    return false;
  }
  
  return true;
};

// Constants for UI and UX
export const WEB3AUTH_CONSTANTS = {
  MODAL_CONFIG: {
    theme: 'light' as const,
    appLogo: '/logo.png',
    defaultLanguage: 'en' as const,
  },
  ADAPTER_SETTINGS: {
    storageKey: 'cta-mission-web3auth',
    sessionTime: 86400, // 24 hours in seconds,
  },
} as const;