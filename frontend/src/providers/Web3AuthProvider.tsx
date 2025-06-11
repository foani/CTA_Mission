// frontend/src/providers/Web3AuthProvider.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Web3Auth 관련 타입 정의 (실제 Web3Auth SDK 설치 전 임시)
interface Web3AuthUser {
  email?: string;
  name?: string;
  profileImage?: string;
  verifier: string;
  verifierId: string;
  typeOfLogin: 'google' | 'apple' | 'kakao' | 'email';
}

interface Web3AuthWallet {
  address: string;
  privateKey?: string;
  publicKey?: string;
  chainId: number;
}

interface Web3AuthInstance {
  init: () => Promise<void>;
  connect: (adapter: string) => Promise<any>;
  logout: () => Promise<void>;
  getUserInfo: () => Promise<Web3AuthUser>;
  getWalletInfo: () => Promise<Web3AuthWallet>;
  isConnected: boolean;
}

// Context 타입 정의
interface Web3AuthContextType {
  // 상태
  isInitialized: boolean;
  isConnected: boolean;
  isLoading: boolean;
  user: Web3AuthUser | null;
  wallet: Web3AuthWallet | null;
  error: string | null;

  // 메서드
  login: (provider: 'google' | 'apple' | 'kakao') => Promise<void>;
  logout: () => Promise<void>;
  reconnect: () => Promise<void>;
  clearError: () => void;
}

// Context 생성
const Web3AuthContext = createContext<Web3AuthContextType | null>(null);

// Hook
export const useWeb3Auth = (): Web3AuthContextType => {
  const context = useContext(Web3AuthContext);
  if (!context) {
    throw new Error('useWeb3Auth must be used within a Web3AuthProvider');
  }
  return context;
};

// Provider Props
interface Web3AuthProviderProps {
  children: ReactNode;
}

// 환경 변수 타입
interface Web3AuthConfig {
  clientId: string;
  chainConfig: {
    chainNamespace: string;
    chainId: string;
    rpcUrl: string;
    displayName: string;
    blockExplorer: string;
    ticker: string;
    tickerName: string;
  };
}

// Web3Auth 설정 (Catena 네트워크)
const WEB3AUTH_CONFIG: Web3AuthConfig = {
  clientId: import.meta.env.VITE_WEB3AUTH_CLIENT_ID || 'demo-client-id',
  chainConfig: {
    chainNamespace: 'eip155',
    chainId: import.meta.env.VITE_CATENA_CHAIN_ID || '0x3E8', // 1000
    rpcUrl: import.meta.env.VITE_CATENA_RPC_URL || 'https://cvm.node.creatachain.com',
    displayName: import.meta.env.VITE_CATENA_CHAIN_NAME || 'Catena Network',
    blockExplorer: import.meta.env.VITE_CATENA_EXPLORER_URL || 'https://catena.explorer.creatachain.com',
    ticker: import.meta.env.VITE_CATENA_CURRENCY_SYMBOL || 'CTA',
    tickerName: import.meta.env.VITE_CATENA_CURRENCY_NAME || 'Catena'
  }
};

// Mock Web3Auth 구현 (실제 SDK 설치 전 임시)
class MockWeb3Auth implements Web3AuthInstance {
  public isConnected = false;
  private userInfo: Web3AuthUser | null = null;
  private walletInfo: Web3AuthWallet | null = null;

  async init(): Promise<void> {
    // 실제로는 Web3Auth SDK 초기화
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Web3Auth 초기화 완료');
  }

  async connect(adapter: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock 사용자 정보 생성
    this.userInfo = {
      email: 'user@example.com',
      name: 'Test User',
      profileImage: 'https://via.placeholder.com/100',
      verifier: adapter,
      verifierId: `${adapter}_user_123`,
      typeOfLogin: adapter as 'google' | 'apple' | 'kakao'
    };

    // Mock 지갑 정보 생성
    this.walletInfo = {
      address: '0x' + Math.random().toString(16).substr(2, 40),
      chainId: parseInt(import.meta.env.VITE_CATENA_CHAIN_ID || '1000')
    };

    this.isConnected = true;
    return this.userInfo;
  }

  async logout(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    this.isConnected = false;
    this.userInfo = null;
    this.walletInfo = null;
  }

  async getUserInfo(): Promise<Web3AuthUser> {
    if (!this.userInfo) throw new Error('User not connected');
    return this.userInfo;
  }

  async getWalletInfo(): Promise<Web3AuthWallet> {
    if (!this.walletInfo) throw new Error('Wallet not connected');
    return this.walletInfo;
  }
}

// Provider 컴포넌트
export const Web3AuthProvider: React.FC<Web3AuthProviderProps> = ({ children }) => {
  // 상태 관리
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<Web3AuthUser | null>(null);
  const [wallet, setWallet] = useState<Web3AuthWallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [web3auth, setWeb3auth] = useState<Web3AuthInstance | null>(null);

  // Web3Auth 인스턴스 초기화
  const initializeWeb3Auth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 실제로는 Web3Auth SDK 사용
      // import { Web3Auth } from "@web3auth/modal";
      // const web3authInstance = new Web3Auth({
      //   clientId: WEB3AUTH_CONFIG.clientId,
      //   chainConfig: WEB3AUTH_CONFIG.chainConfig,
      //   web3AuthNetwork: "testnet"
      // });

      // 임시 Mock 사용
      const web3authInstance = new MockWeb3Auth();
      
      await web3authInstance.init();
      setWeb3auth(web3authInstance);
      setIsInitialized(true);

      // 기존 연결 상태 확인
      if (web3authInstance.isConnected) {
        await loadUserData(web3authInstance);
      }

    } catch (error) {
      console.error('Web3Auth 초기화 실패:', error);
      setError('인증 시스템 초기화에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 사용자 데이터 로드
  const loadUserData = useCallback(async (web3authInstance: Web3AuthInstance) => {
    try {
      const [userInfo, walletInfo] = await Promise.all([
        web3authInstance.getUserInfo(),
        web3authInstance.getWalletInfo()
      ]);

      setUser(userInfo);
      setWallet(walletInfo);
      setIsConnected(true);

      // 백엔드에 사용자 정보 전송
      await registerOrUpdateUser(userInfo, walletInfo);

    } catch (error) {
      console.error('사용자 데이터 로드 실패:', error);
      setError('사용자 정보를 불러올 수 없습니다.');
    }
  }, []);

  // 백엔드에 사용자 등록/업데이트
  const registerOrUpdateUser = useCallback(async (userInfo: Web3AuthUser, walletInfo: Web3AuthWallet) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: userInfo.email,
          name: userInfo.name,
          profileImage: userInfo.profileImage,
          verifier: userInfo.verifier,
          verifierId: userInfo.verifierId,
          typeOfLogin: userInfo.typeOfLogin,
          walletAddress: walletInfo.address,
          chainId: walletInfo.chainId
        })
      });

      if (response.ok) {
        const result = await response.json();
        // 백엔드 응답 구조 확인 필요 - 임시로 직접 사용
        if (result.token) {
          localStorage.setItem('token', result.token);
        }
      } else {
        throw new Error('백엔드 사용자 등록 실패');
      }
    } catch (error) {
      console.error('사용자 등록/업데이트 실패:', error);
      // 에러가 있어도 로그인은 계속 진행
    }
  }, []);

  // 로그인 메서드
  const login = useCallback(async (provider: 'google' | 'apple' | 'kakao') => {
    if (!web3auth || !isInitialized) {
      throw new Error('Web3Auth가 초기화되지 않았습니다.');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Web3Auth 연결
      await web3auth.connect(provider);
      await loadUserData(web3auth);

    } catch (error) {
      console.error('로그인 실패:', error);
      setError(`${provider} 로그인에 실패했습니다.`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [web3auth, isInitialized, loadUserData]);

  // 로그아웃 메서드
  const logout = useCallback(async () => {
    if (!web3auth) return;

    try {
      setIsLoading(true);
      setError(null);

      await web3auth.logout();
      
      // 상태 초기화
      setUser(null);
      setWallet(null);
      setIsConnected(false);

      // 로컬 스토리지 클리어
      localStorage.removeItem('token');

    } catch (error) {
      console.error('로그아웃 실패:', error);
      setError('로그아웃에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [web3auth]);

  // 재연결 메서드
  const reconnect = useCallback(async () => {
    if (!web3auth || !isInitialized) return;

    try {
      setIsLoading(true);
      setError(null);

      if (web3auth.isConnected) {
        await loadUserData(web3auth);
      }
    } catch (error) {
      console.error('재연결 실패:', error);
      setError('재연결에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [web3auth, isInitialized, loadUserData]);

  // 에러 클리어
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 초기화
  useEffect(() => {
    initializeWeb3Auth();
  }, [initializeWeb3Auth]);

  // Context 값
  const contextValue: Web3AuthContextType = {
    isInitialized,
    isConnected,
    isLoading,
    user,
    wallet,
    error,
    login,
    logout,
    reconnect,
    clearError
  };

  return (
    <Web3AuthContext.Provider value={contextValue}>
      {children}
    </Web3AuthContext.Provider>
  );
};

export default Web3AuthProvider;// ...existing code...
this.walletInfo = {
  address: '0x' + Math.random().toString(16).substr(2).padEnd(40, '0'),
  chainId: parseInt(import.meta.env.VITE_CATENA_CHAIN_ID || '1000')
};
// ...existing code...// ...existing code...
this.walletInfo = {
  address: '0x' + Math.random().toString(16).substr(2).padEnd(40, '0'),
  chainId: parseInt(import.meta.env.VITE_CATENA_CHAIN_ID || '1000')
};
// ...existing code...