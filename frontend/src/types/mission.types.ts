/**
 * 미션 시스템 관련 타입 정의
 * @file mission.types.ts
 * @description 사전 미션, 일일/주간 미션, 보상 시스템 관련 타입들
 */

// ================================
// 미션 기본 타입
// ================================

export enum MissionType {
  WALLET_INSTALL = 'wallet_install',           // 지갑 설치
  HOMEPAGE_VISIT = 'homepage_visit',           // 홈페이지 방문
  SOCIAL_FOLLOW = 'social_follow',             // 소셜 팔로우
  GAME_PLAY = 'game_play',                     // 게임 플레이
  DAILY_LOGIN = 'daily_login',                 // 일일 로그인
  PREDICTION_CORRECT = 'prediction_correct',    // 예측 성공
  RANKING_ACHIEVEMENT = 'ranking_achievement',  // 랭킹 달성
  CONSECUTIVE_WINS = 'consecutive_wins',        // 연속 승리
  TOTAL_SCORE = 'total_score',                 // 총 점수 달성
  ACCURACY_RATE = 'accuracy_rate',             // 정확도 달성
  COMMUNITY_ENGAGEMENT = 'community_engagement' // 커뮤니티 참여
}

export enum MissionStatus {
  LOCKED = 'locked',         // 잠김 (조건 미충족)
  AVAILABLE = 'available',   // 수행 가능
  IN_PROGRESS = 'in_progress', // 진행 중
  COMPLETED = 'completed',   // 완료
  CLAIMED = 'claimed',       // 보상 수령 완료
  EXPIRED = 'expired'        // 기간 만료
}

export enum MissionDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert'
}

export enum MissionCategory {
  ONBOARDING = 'onboarding',     // 온보딩
  DAILY = 'daily',               // 일일 미션
  WEEKLY = 'weekly',             // 주간 미션
  MONTHLY = 'monthly',           // 월간 미션
  SPECIAL = 'special',           // 특별 미션
  ACHIEVEMENT = 'achievement',   // 업적 미션
  SOCIAL = 'social',             // 소셜 미션
  GAMEPLAY = 'gameplay'          // 게임플레이 미션
}

// ================================
// 미션 보상 타입
// ================================

export enum RewardType {
  CTA = 'CTA',           // CTA 토큰
  POINTS = 'POINTS',     // 포인트
  BADGE = 'BADGE',       // 배지
  NFT = 'NFT',           // NFT
  MULTIPLIER = 'MULTIPLIER' // 점수 배율
}

export interface MissionReward {
  type: RewardType;
  amount: number;
  badge?: string;
  nftId?: string;
  multiplierDuration?: number; // 배율 적용 시간 (시간)
  description: string;
}

// ================================
// 미션 요구사항 타입
// ================================

export enum RequirementType {
  WALLET_INSTALL_CHECK = 'wallet_install_check',
  HOMEPAGE_VISIT_TIME = 'homepage_visit_time',
  GAME_COUNT = 'game_count',
  WIN_COUNT = 'win_count',
  SCORE_THRESHOLD = 'score_threshold',
  ACCURACY_THRESHOLD = 'accuracy_threshold',
  CONSECUTIVE_DAYS = 'consecutive_days',
  SOCIAL_FOLLOW = 'social_follow',
  RANKING_POSITION = 'ranking_position'
}

export interface MissionRequirement {
  type: RequirementType;
  value: number | string | boolean;
  description: string;
  metadata?: Record<string, any>;
}

// ================================
// 메인 미션 인터페이스
// ================================

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  category: MissionCategory;
  difficulty: MissionDifficulty;
  status: MissionStatus;
  reward: MissionReward;
  requirements: MissionRequirement[];
  progress: number;       // 0-100 진행률
  maxProgress: number;    // 목표 수치
  currentProgress: number; // 현재 진행 수치
  startDate?: Date;
  endDate?: Date;
  isDaily: boolean;
  isWeekly: boolean;
  isMonthly: boolean;
  isSpecial: boolean;     // 특별 이벤트 미션
  icon: string;           // 아이콘 이름 또는 URL
  estimatedTime: number;  // 예상 소요 시간 (분)
  prerequisiteIds?: string[]; // 선행 미션 ID들
  weight: number;         // 미션 가중치 (점수 계산용)
  tags: string[];         // 태그 (검색/필터용)
  createdAt: Date;
  updatedAt: Date;
}

// ================================
// 미션 진행 상황 타입
// ================================

export interface MissionProgress {
  id: string;
  userId: string;
  missionId: string;
  currentValue: number;
  targetValue: number;
  progress: number; // 0-100
  isCompleted: boolean;
  completedAt?: Date;
  claimedAt?: Date;
  attempts: number;
  lastAttemptAt?: Date;
  metadata?: Record<string, any>; // 추가 진행 데이터
  createdAt: Date;
  updatedAt: Date;
}

// ================================
// 미션 카테고리 및 그룹화
// ================================

export interface MissionCategoryInfo {
  id: MissionCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  missions: Mission[];
  totalMissions: number;
  completedMissions: number;
  totalRewards: number;
}

// ================================
// 특별 미션 관련 타입
// ================================

export interface SpecialMission extends Mission {
  eventId: string;
  eventName: string;
  eventDescription: string;
  participantLimit?: number;
  currentParticipants: number;
  isLimited: boolean;
  unlockConditions?: MissionRequirement[];
}

export interface MissionEvent {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  missions: SpecialMission[];
  totalRewards: number;
  participantCount: number;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  bannerImage?: string;
}

// ================================
// 미션 검증 타입
// ================================

export interface MissionVerification {
  missionId: string;
  userId: string;
  verificationType: MissionType;
  verificationData: Record<string, any>;
  isVerified: boolean;
  verifiedAt?: Date;
  verificationMethod: 'automatic' | 'manual' | 'external_api';
  verificationDetails?: string;
}

// 지갑 설치 확인 데이터
export interface WalletInstallVerification {
  appStoreUrl: string;
  playStoreUrl: string;
  installedVersion?: string;
  deviceInfo?: {
    platform: 'ios' | 'android';
    version: string;
    model: string;
  };
}

// 홈페이지 방문 확인 데이터  
export interface HomepageVisitVerification {
  visitedUrl: string;
  visitDuration: number; // 초
  userAgent: string;
  ipAddress: string;
  timestamp: Date;
  referrer?: string;
}

// ================================
// API 요청/응답 타입
// ================================

export interface MissionListRequest {
  userId: string;
  category?: MissionCategory;
  status?: MissionStatus;
  includeExpired?: boolean;
  limit?: number;
  offset?: number;
}

export interface MissionListResponse {
  success: boolean;
  missions: Mission[];
  categories: MissionCategoryInfo[];
  userProgress: Record<string, MissionProgress>;
  totalMissions: number;
  completedMissions: number;
  totalRewards: number;
  totalPages: number;
  currentPage: number;
}

export interface MissionStartRequest {
  missionId: string;
  userId: string;
}

export interface MissionStartResponse {
  success: boolean;
  mission: Mission;
  progress: MissionProgress;
  message: string;
}

export interface MissionClaimRequest {
  missionId: string;
  userId: string;
}

export interface MissionClaimResponse {
  success: boolean;
  reward: MissionReward;
  newStatus: MissionStatus;
  transactionHash?: string;
  message: string;
}

export interface MissionProgressUpdateRequest {
  missionId: string;
  userId: string;
  progressValue: number;
  metadata?: Record<string, any>;
}

export interface MissionProgressUpdateResponse {
  success: boolean;
  mission: Mission;
  progress: MissionProgress;
  statusChanged: boolean;
  newStatus?: MissionStatus;
  autoCompleted: boolean;
}

export interface MissionVerifyRequest {
  missionId: string;
  userId: string;
  verificationType: MissionType;
  verificationData: Record<string, any>;
}

export interface MissionVerifyResponse {
  success: boolean;
  verification: MissionVerification;
  progressUpdated: boolean;
  missionCompleted: boolean;
  message: string;
}

// ================================
// 미션 필터링 및 검색
// ================================

export interface MissionFilter {
  status?: MissionStatus[];
  type?: MissionType[];
  category?: MissionCategory[];
  difficulty?: MissionDifficulty[];
  isDaily?: boolean;
  isWeekly?: boolean;
  isMonthly?: boolean;
  isSpecial?: boolean;
  available?: boolean;
  hasRewards?: boolean;
  tags?: string[];
}

export interface MissionSearchParams {
  query?: string;
  filter?: MissionFilter;
  sortBy?: 'createdAt' | 'difficulty' | 'reward' | 'progress' | 'deadline';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ================================
// 미션 통계 및 분석
// ================================

export interface UserMissionStats {
  userId: string;
  totalMissions: number;
  completedMissions: number;
  claimedRewards: number;
  totalPoints: number;
  totalCTA: number;
  completionRate: number;
  averageCompletionTime: number; // 분
  favoriteCategory: MissionCategory;
  currentStreak: number; // 연속 일일 미션 완료
  bestStreak: number;
  lastCompletedAt?: Date;
  achievements: string[]; // 획득한 배지들
}

export interface MissionAnalytics {
  missionId: string;
  totalAttempts: number;
  totalCompletions: number;
  completionRate: number;
  averageCompletionTime: number;
  difficultyRating: number; // 사용자 평가 기반
  popularityScore: number;
  rewardEfficiency: number; // 시간 대비 보상
  dropoffPoints: number[]; // 진행률별 이탈 지점
}

// ================================
// 미션 설정 및 관리
// ================================

export interface MissionConfiguration {
  maxDailyMissions: number;
  maxWeeklyMissions: number;
  maxMonthlyMissions: number;
  defaultRewardMultiplier: number;
  difficultyMultipliers: {
    [key in MissionDifficulty]: number;
  };
  categoryPriorities: {
    [key in MissionCategory]: number;
  };
  autoClaimEnabled: boolean;
  notificationEnabled: boolean;
  verificationTimeouts: {
    [key in MissionType]: number; // 분
  };
}

// ================================
// 미션 이벤트 타입
// ================================

export enum MissionEventType {
  MISSION_STARTED = 'mission_started',
  MISSION_PROGRESS = 'mission_progress', 
  MISSION_COMPLETED = 'mission_completed',
  MISSION_CLAIMED = 'mission_claimed',
  MISSION_EXPIRED = 'mission_expired',
  REWARD_DISTRIBUTED = 'reward_distributed'
}

export interface MissionEvent {
  type: MissionEventType;
  payload: {
    missionId: string;
    userId: string;
    progress?: MissionProgress;
    reward?: MissionReward;
    [key: string]: any;
  };
  timestamp: Date;
}