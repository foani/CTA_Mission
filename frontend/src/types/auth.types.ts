/**
 * 인증 관련 타입 정의
 * @file auth.types.ts
 * @description Web3Auth, 소셜 로그인, Account Abstraction 관련 타입들
 */

// ================================
// 소셜 로그인 관련 타입
// ================================

export type SocialProvider = 'google' | 'apple' | 'kakao';

export interface SocialLoginConfig {
  provider: SocialProvider;
  clientId: string;
  enabled: boolean;
  scopes?: string[];
}

export interface SocialUserInfo {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
  provider: SocialProvider;
  providerId: string;
}

// ================================
// Web3Auth 관련 타입 (확장)
// ================================

export interface ChainConfig {
  chainNamespace: string;
  chainId: string;
  rpcTarget: string;
  displayName: string;
  blockExplorer: string;
  ticker: string;
  tickerName: string;
}

export interface OAuthProvider {
  name: string;
  clientId: string;
  verifier: string;
}

export interface Web3AuthConfig {
  clientId: string;
  web3AuthNetwork: any; // WEB3AUTH_NETWORK enum
  chainConfig: ChainConfig;
}

export interface Web3AuthUserInfo {
  email?: string;
  name?: string;
  profileImage?: string;
  aggregateVerifier?: string;
  verifier: string;
  verifierId: string;
  typeOfLogin: string;
  dappShare?: string;
  idToken?: string;
  oAuthIdToken?: string;
  oAuthAccessToken?: string;
}

export interface Web3AuthState {
  isInitialized: boolean;
  isConnected: boolean;
  isLoading: boolean;
  user: Web3AuthUserInfo | null;
  provider: any | null;
  web3auth: any | null;
  error: string | null;
}

// ================================
// 지갑 관련 타입
// ================================

export interface WalletInfo {
  address: string;
  balance: string;
  chainId: number;
  networkName: string;
  isAccountAbstraction: boolean;
}

export interface AccountAbstractionWallet {
  address: string;
  owner: string;
  isDeployed: boolean;
  implementation: string;
  salt?: string;
  initCode?: string;
}

// ================================
// 사용자 인증 상태 타입
// ================================

export enum AuthStatus {
  UNAUTHENTICATED = 'unauthenticated',
  AUTHENTICATING = 'authenticating', 
  AUTHENTICATED = 'authenticated',
  ERROR = 'error'
}

export interface User {
  id: string;
  socialId: string;
  socialProvider: SocialProvider;
  walletAddress: string;
  nickname: string;
  email?: string;
  profileImage?: string;
  totalScore: number;
  gamesPlayed: number;
  missionCompleted: boolean;
  walletInstalled: boolean;
  homepageVisited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  wallet: WalletInfo | null;
  isLoading: boolean;
  error: string | null;
  lastLoginAt?: Date;
}

// ================================
// 인증 API 요청/응답 타입
// ================================

export interface LoginRequest {
  provider: SocialProvider;
  socialToken: string;
  walletAddress: string;
  signature?: string;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  accessToken: string;
  expiresIn: number;
}

export interface ProfileUpdateRequest {
  nickname?: string;
  profileImage?: string;
  email?: string;
}

export interface ProfileUpdateResponse {
  success: boolean;
  user: User;
  message: string;
}

// ================================
// JWT 토큰 관련 타입
// ================================

export interface JWTPayload {
  sub: string; // user id
  email?: string;
  walletAddress: string;
  socialProvider: SocialProvider;
  iat: number;
  exp: number;
  jti: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

// ================================
// 인증 에러 타입
// ================================

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  WALLET_CONNECTION_FAILED = 'WALLET_CONNECTION_FAILED',
  SOCIAL_LOGIN_FAILED = 'SOCIAL_LOGIN_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN'
}

export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: any;
  timestamp: Date;
}

// ================================
// 인증 이벤트 타입
// ================================

export enum AuthEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token_refresh',
  PROFILE_UPDATE = 'profile_update',
  WALLET_CONNECTED = 'wallet_connected',
  WALLET_DISCONNECTED = 'wallet_disconnected'
}

export interface AuthEvent {
  type: AuthEventType;
  payload: any;
  timestamp: Date;
  userId?: string;
}

// ================================
// 보안 관련 타입
// ================================

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  lastPasswordChange?: string; // Date → string
  trustedDevices: string[];
  loginAttempts: number;
  lastFailedLogin?: string; // Date → string
  accountLocked: boolean;
  lockoutUntil?: string; // Date → string
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  userAgent: string;
  ipAddress: string;
  location?: string;
  isTrusted: boolean;
  lastUsed: string; // Date → string
  createdAt: string; // Date → string
}

// ================================
// 권한 관련 타입
// ================================

export enum Permission {
  READ_PROFILE = 'read_profile',
  UPDATE_PROFILE = 'update_profile',
  PLAY_GAME = 'play_game',
  CLAIM_REWARDS = 'claim_rewards',
  VIEW_RANKINGS = 'view_rankings',
  ADMIN_ACCESS = 'admin_access'
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  description: string;
}

export interface UserPermissions {
  userId: string;
  roles: Role[];
  permissions: Permission[];
  isAdmin: boolean;
  canPlayGame: boolean;
  canClaimRewards: boolean;
}