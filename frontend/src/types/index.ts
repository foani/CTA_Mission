/**
 * 공통 타입 Export 파일
 * @file index.ts
 * @description 모든 타입 정의를 중앙에서 관리하고 export
 */

// ================================
// 인증 관련 타입 Export
// ================================

export type {
  // 소셜 로그인
  SocialProvider,
  SocialLoginConfig,
  SocialUserInfo,
  
  // Web3Auth
  Web3AuthConfig,
  Web3AuthUserInfo,
  Web3AuthState,
  
  // 지갑
  WalletInfo,
  AccountAbstractionWallet,
  
  // 사용자 인증
  User,
  AuthState,
  
  // API 요청/응답
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ProfileUpdateRequest,
  ProfileUpdateResponse,
  
  // JWT
  JWTPayload,
  TokenPair,
  
  // 에러
  AuthError,
  
  // 이벤트
  AuthEvent,
  
  // 보안
  SecuritySettings,
  DeviceInfo,
  
  // 권한
  Role,
  UserPermissions
} from './auth.types';

export {
  AuthStatus,
  AuthErrorCode,
  AuthEventType,
  Permission
} from './auth.types';

// ================================
// 게임 관련 타입 Export
// ================================

export type {
  // 기본 게임
  GameSession,
  GameRound,
  UserPrediction,
  GameParticipation,
  
  // 가격 데이터
  PriceData,
  PriceHistory,
  
  // 점수 및 랭킹
  ScoreCalculation,
  UserStats,
  RankingEntry,
  Leaderboard,
  
  // 에어드롭
  AirdropReward,
  AirdropDistribution,
  UserAirdrop,
  
  // 게임 설정
  GameConfiguration,
  
  // API 요청/응답
  StartGameRequest,
  StartGameResponse,
  SubmitPredictionRequest,
  SubmitPredictionResponse,
  GameResultRequest,
  GameResultResponse,
  LeaderboardRequest,
  LeaderboardResponse,
  UserStatsRequest,
  UserStatsResponse,
  
  // 이벤트
  GameEvent,
  
  // 업적
  Achievement,
  UserAchievement
} from './game.types';

export {
  GameStatus,
  PredictionType,
  GameResult,
  CryptoSymbol,
  UserTier,
  RankingPeriod,
  AirdropTier,
  GameEventType,
  AchievementType
} from './game.types';

// ================================
// 미션 관련 타입 Export
// ================================

export type {
  // 기본 미션
  Mission,
  MissionProgress,
  MissionCategoryInfo,
  
  // 보상
  MissionReward,
  
  // 요구사항
  MissionRequirement,
  
  // 특별 미션
  SpecialMission,
  MissionEvent as MissionEventData,
  
  // 검증
  MissionVerification,
  WalletInstallVerification,
  HomepageVisitVerification,
  
  // API 요청/응답
  MissionListRequest,
  MissionListResponse,
  MissionStartRequest,
  MissionStartResponse,
  MissionClaimRequest,
  MissionClaimResponse,
  MissionProgressUpdateRequest,
  MissionProgressUpdateResponse,
  MissionVerifyRequest,
  MissionVerifyResponse,
  
  // 필터링 및 검색
  MissionFilter,
  MissionSearchParams,
  
  // 통계
  UserMissionStats,
  MissionAnalytics,
  
  // 설정
  MissionConfiguration,
  
  // 이벤트
  MissionEvent
} from './mission.types';

export {
  MissionType,
  MissionStatus,
  MissionDifficulty,
  MissionCategory,
  RewardType,
  RequirementType,
  MissionEventType
} from './mission.types';

// ================================
// 공통 유틸리티 타입
// ================================

/**
 * API 응답 기본 구조
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

/**
 * 페이지네이션 정보
 */
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * 페이지네이션이 포함된 API 응답
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: PaginationInfo;
}

/**
 * 정렬 옵션
 */
export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * 필터 옵션 기본 구조
 */
export interface BaseFilter {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

/**
 * 시간 범위 필터
 */
export interface TimeRangeFilter {
  startDate?: Date;
  endDate?: Date;
  period?: 'day' | 'week' | 'month' | 'year';
}

/**
 * 네트워크 정보
 */
export interface NetworkInfo {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

/**
 * 트랜잭션 정보
 */
export interface TransactionInfo {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
  gasUsed?: string;
  blockNumber?: number;
  blockHash?: string;
  timestamp?: Date;
  status: 'pending' | 'confirmed' | 'failed';
}

/**
 * 에러 정보 기본 구조
 */
export interface BaseError {
  code: string;
  message: string;
  timestamp: Date;
  stack?: string;
  context?: Record<string, any>;
}

/**
 * 로딩 상태
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * 앱 전역 상태
 */
export interface AppState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  network: NetworkInfo;
  lastUpdated: Date;
}

/**
 * 환경 설정
 */
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  API_BASE_URL: string;
  WEB3AUTH_CLIENT_ID: string;
  CATENA_RPC_URL: string;
  CATENA_CHAIN_ID: number;
  CATENA_EXPLORER_URL: string;
  PRICE_API_KEY?: string;
  SENTRY_DSN?: string;
  ANALYTICS_ID?: string;
}

// ================================
// Re-export from existing files
// ================================

// Web3Auth 관련 기존 타입들 (호환성 유지)
export type { Web3AuthState as LegacyWeb3AuthState } from './web3auth';

// ================================
// 타입 가드 및 유틸리티 함수 타입
// ================================

/**
 * 타입 가드 함수들의 타입 정의
 */
export type TypeGuard<T> = (value: any) => value is T;

/**
 * 옵셔널 필드를 가진 타입 생성
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 필수 필드로 변환
 */
export type Required<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * 깊은 부분적(Deep Partial) 타입
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 키-값 쌍 타입
 */
export type KeyValuePair<T = any> = {
  key: string;
  value: T;
};

/**
 * 이벤트 핸들러 타입
 */
export type EventHandler<T = any> = (event: T) => void | Promise<void>;

/**
 * 비동기 함수 타입
 */
export type AsyncFunction<T = any, R = any> = (args: T) => Promise<R>;