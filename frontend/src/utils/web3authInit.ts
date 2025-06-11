import { Web3Auth } from '@web3auth/modal';
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from '@web3auth/base';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';
import { OpenloginAdapter } from '@web3auth/openlogin-adapter';
import { WalletConnectV2Adapter } from '@web3auth/wallet-connect-v2-adapter';
import { MetamaskAdapter } from '@web3auth/metamask-adapter';

import { 
  WEB3AUTH_CONFIG, 
  CATENA_CHAIN_CONFIG,
  WEB3AUTH_CONSTANTS,
  validateWeb3AuthConfig 
} from '../config/web3auth';

/**
 * Web3Auth initialization result
 */
export interface Web3AuthInitResult {
  web3auth: Web3Auth;
  isInitialized: boolean;
  error?: string;
}

/**
 * Initialize Web3Auth with all configurations
 */
export const initializeWeb3Auth = async (): Promise<Web3AuthInitResult> => {
  try {
    // Validate configuration first
    if (!validateWeb3AuthConfig()) {
      return {
        web3auth: null as any,
        isInitialized: false,
        error: 'Web3Auth configuration validation failed',
      };
    }

    // Initialize Ethereum Provider for Catena Network
    const privateKeyProvider = new EthereumPrivateKeyProvider({
      config: { 
        chainConfig: {
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          chainId: CATENA_CHAIN_CONFIG.chainId,
          rpcTarget: CATENA_CHAIN_CONFIG.rpcTarget,
          displayName: CATENA_CHAIN_CONFIG.displayName,
          blockExplorer: CATENA_CHAIN_CONFIG.blockExplorer,
          ticker: CATENA_CHAIN_CONFIG.ticker,
          tickerName: CATENA_CHAIN_CONFIG.tickerName,
        }
      }
    });

    // Create Web3Auth instance
    const web3auth = new Web3Auth({
      clientId: WEB3AUTH_CONFIG.clientId,
      web3AuthNetwork: WEB3AUTH_CONFIG.web3AuthNetwork,
      chainConfig: {
        chainNamespace: CHAIN_NAMESPACES.EIP155,
        chainId: CATENA_CHAIN_CONFIG.chainId,
        rpcTarget: CATENA_CHAIN_CONFIG.rpcTarget,
        displayName: CATENA_CHAIN_CONFIG.displayName,
        blockExplorer: CATENA_CHAIN_CONFIG.blockExplorer,
        ticker: CATENA_CHAIN_CONFIG.ticker,
        tickerName: CATENA_CHAIN_CONFIG.tickerName,
      },
      privateKeyProvider,
      uiConfig: {
        appName: 'CTA Mission',
        appUrl: window.location.origin,
        theme: WEB3AUTH_CONSTANTS.MODAL_CONFIG.theme,
        logoLight: WEB3AUTH_CONSTANTS.MODAL_CONFIG.appLogo,
        logoDark: WEB3AUTH_CONSTANTS.MODAL_CONFIG.appLogo,
        defaultLanguage: WEB3AUTH_CONSTANTS.MODAL_CONFIG.defaultLanguage,
        mode: 'light',
        useLogoLoader: true,
        uxMode: 'popup',
      },
      sessionTime: WEB3AUTH_CONSTANTS.ADAPTER_SETTINGS.sessionTime,
      storageKey: WEB3AUTH_CONSTANTS.ADAPTER_SETTINGS.storageKey,
    });

    // Configure adapters
    await configureAdapters(web3auth);

    // Initialize Web3Auth
    await web3auth.initModal();

    return {
      web3auth,
      isInitialized: true,
    };

  } catch (error) {
    console.error('Web3Auth initialization error:', error);
    return {
      web3auth: null as any,
      isInitialized: false,
      error: error instanceof Error ? error.message : 'Unknown initialization error',
    };
  }
};

/**
 * Configure all Web3Auth adapters
 */
const configureAdapters = async (web3auth: Web3Auth): Promise<void> => {
  try {
    // OpenLogin Adapter for Social Logins
    const openloginAdapter = new OpenloginAdapter({
      loginSettings: {
        mfaLevel: 'optional',
      },
      adapterSettings: {
        uxMode: 'popup',
        whiteLabel: {
          appName: 'CTA Mission',
          appUrl: window.location.origin,
          logoLight: WEB3AUTH_CONSTANTS.MODAL_CONFIG.appLogo,
          logoDark: WEB3AUTH_CONSTANTS.MODAL_CONFIG.appLogo,
          defaultLanguage: WEB3AUTH_CONSTANTS.MODAL_CONFIG.defaultLanguage,
          mode: 'light',
        },
      },
    });
    web3auth.configureAdapter(openloginAdapter);

    // WalletConnect V2 Adapter
    const walletConnectV2Adapter = new WalletConnectV2Adapter({
      adapterSettings: {
        qrcodeModal: {
          displayQRCode: true,
        },
        wcV2InitOptions: {
          projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo_project_id',
          metadata: {
            name: 'CTA Mission',
            description: 'CTA Mission - Crypto Price Prediction Game',
            url: window.location.origin,
            icons: [WEB3AUTH_CONSTANTS.MODAL_CONFIG.appLogo],
          },
        },
      },
      loginSettings: {
        mfaLevel: 'optional',
      },
      chainConfig: {
        chainNamespace: CHAIN_NAMESPACES.EIP155,
        chainId: CATENA_CHAIN_CONFIG.chainId,
        rpcTarget: CATENA_CHAIN_CONFIG.rpcTarget,
        displayName: CATENA_CHAIN_CONFIG.displayName,
        blockExplorer: CATENA_CHAIN_CONFIG.blockExplorer,
        ticker: CATENA_CHAIN_CONFIG.ticker,
        tickerName: CATENA_CHAIN_CONFIG.tickerName,
      },
    });
    web3auth.configureAdapter(walletConnectV2Adapter);

    // Metamask Adapter
    const metamaskAdapter = new MetamaskAdapter({
      clientId: WEB3AUTH_CONFIG.clientId,
      sessionTime: WEB3AUTH_CONSTANTS.ADAPTER_SETTINGS.sessionTime,
      web3AuthNetwork: WEB3AUTH_CONFIG.web3AuthNetwork,
      chainConfig: {
        chainNamespace: CHAIN_NAMESPACES.EIP155,
        chainId: CATENA_CHAIN_CONFIG.chainId,
        rpcTarget: CATENA_CHAIN_CONFIG.rpcTarget,
        displayName: CATENA_CHAIN_CONFIG.displayName,
        blockExplorer: CATENA_CHAIN_CONFIG.blockExplorer,
        ticker: CATENA_CHAIN_CONFIG.ticker,
        tickerName: CATENA_CHAIN_CONFIG.tickerName,
      },
    });
    web3auth.configureAdapter(metamaskAdapter);

  } catch (error) {
    console.error('Failed to configure adapters:', error);
    throw error;
  }
};

/**
 * Check if Web3Auth is properly configured
 */
export const checkWeb3AuthHealth = (): { isHealthy: boolean; issues: string[] } => {
  const issues: string[] = [];

  // Check environment variables
  if (!import.meta.env.VITE_WEB3AUTH_CLIENT_ID) {
    issues.push('VITE_WEB3AUTH_CLIENT_ID is not configured');
  }

  if (!import.meta.env.VITE_CATENA_RPC_URL) {
    issues.push('VITE_CATENA_RPC_URL is not configured');
  }

  if (!import.meta.env.VITE_CATENA_EXPLORER_URL) {
    issues.push('VITE_CATENA_EXPLORER_URL is not configured');
  }

  // Check network configuration
  if (CATENA_CHAIN_CONFIG.chainId !== '0x3E8') {
    issues.push('Catena Chain ID should be 0x3E8 (1000)');
  }

  return {
    isHealthy: issues.length === 0,
    issues,
  };
};

/**
 * Get Web3Auth status for debugging
 */
export interface Web3AuthStatus {
  status: 'not_initialized' | 'initialized';
  connected: boolean;
  provider: any;
  user: 'user_available' | 'no_user' | null;
  connectedAdapter?: string;
}

export const getWeb3AuthStatus = (web3auth: Web3Auth | null): Web3AuthStatus => {
  if (!web3auth) {
    return {
      status: 'not_initialized',
      connected: false,
      provider: null,
      user: null,
    };
  }

  return {
    status: 'initialized',
    connected: web3auth.connected,
    provider: web3auth.provider,
    user: web3auth.connected ? 'user_available' : 'no_user',
    connectedAdapter: web3auth.connectedAdapterName,
  };
};

/**
 * Reset Web3Auth state (useful for debugging)
 */
export const resetWeb3AuthState = async (web3auth: Web3Auth): Promise<void> => {
  try {
    if (web3auth.connected) {
      await web3auth.logout();
    }
    
    // Clear local storage
    localStorage.removeItem(WEB3AUTH_CONSTANTS.ADAPTER_SETTINGS.storageKey);
    
    console.log('Web3Auth state reset successfully');
  } catch (error) {
    console.error('Failed to reset Web3Auth state:', error);
    throw error;
  }
};