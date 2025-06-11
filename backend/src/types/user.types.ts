// src/types/user.types.ts

/**
 * 사용자 역할 정의
 */
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR'
}

/**
 * 사용자 상태 정의
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED'
}

/**
 * OAuth 제공자 정의
 */
export enum OAuthProvider {
  GOOGLE = 'GOOGLE',
  APPLE = 'APPLE',
  KAKAO = 'KAKAO',
  WEB3AUTH = 'WEB3AUTH'
}

/**
 * 포인트 거래 타입
 */
export enum PointTransactionType {
  EARNED = 'EARNED',
  SPENT = 'SPENT',
  BONUS = 'BONUS',
  PENALTY = 'PENALTY',
  ADJUSTMENT = 'ADJUSTMENT',
  MISSION_COMPLETION = 'MISSION_COMPLETION',
  GAME_REWARD = 'GAME_REWARD',
  AIRDROP = 'AIRDROP',
  REFERRAL = 'REFERRAL'
}

/**
 * 사용자 기본 인터페이스
 */
export interface IUser {
  id: string;
  email?: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  walletAddress?: string;
  role: UserRole;
  status: UserStatus;
  totalPoints: number;
  lastLoginAt?: Date;
  oauth?: IOAuthInfo[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * OAuth 정보 인터페이스
 */
export interface IOAuthInfo {
  provider: OAuthProvider;
  providerId: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 사용자 생성 DTO
 */
export interface CreateUserDto {
  email?: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  walletAddress?: string;
  oauthProvider?: OAuthProvider;
  oauthProviderId?: string;
}

/**
 * 사용자 업데이트 DTO
 */
export interface UpdateUserDto {
  email?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  walletAddress?: string;
  status?: UserStatus;
}

/**
 * 사용자 포인트 업데이트 DTO
 */
export interface UpdateUserPointsDto {
  userId: string;
  points: number;
  reason: string;
  metadata?: Record<string, any>;
}

/**
 * 사용자 인증 응답
 */
export interface AuthResponse {
  user: IUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * 소셜 로그인 요청 DTO
 */
export interface SocialLoginDto {
  provider: OAuthProvider;
  idToken?: string;
  accessToken?: string;
  authorizationCode?: string;
}

/**
 * 사용자 필터링 옵션
 */
export interface UserFilterOptions {
  role?: UserRole;
  status?: UserStatus;
  searchTerm?: string;
  hasWallet?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * 사용자 포인트 이력
 */
export interface IPointHistory {
  id: string;
  userId: string;
  points: number;
  reason: string;
  type: PointTransactionType;
  relatedId?: string; // 관련 미션 ID, 게임 ID 등
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * 사용자 세션 정보
 */
export interface IUserSession {
  userId: string;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  createdAt: Date;
}