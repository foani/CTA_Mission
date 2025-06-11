/**
 * 게임 관련 타입 정의
 * @file game.types.ts
 * @description 크립토 가격 예측 게임, 랭킹, 에어드롭 관련 타입들
 */

// ================================
// 기본 게임 타입
// ================================

export enum GameStatus {
  WAITING = 'waiting',        // 게임 시작 대기
  ACTIVE = 'active',          // 게임 진행 중
  PREDICTION_CLOSED = 'prediction_closed', // 예측 마감
  CALCULATING = 'calculating', // 결과 계산 중
  FINISHED = 'finished',      // 게임 종료
  CANCELLED = 'cancelled'     // 게임 취소
}

export enum PredictionType {
  UP = 'UP',     // 가격 상승 예측
  DOWN = 'DOWN'  // 가격 하락 예측
}

export enum GameResult {
  WIN = 'WIN',
  LOSE = 'LOSE',
  DRAW = 'DRAW',    // 가격 변동 없음
  CANCELLED = 'CANCELLED'
}

export enum CryptoSymbol {
  BTC = 'BTC',
  ETH = 'ETH', 
  CTA = 'CTA',
  BNB = 'BNB',
  ADA = 'ADA',
  SOL = 'SOL',
  MATIC = 'MATIC',
  DOT = 'DOT'
}

// ================================
// 가격 데이터 타입
// ================================

export interface PriceData {
  symbol: CryptoSymbol;
  price: number;
  timestamp: Date;
  volume24h?: number;
  change24h?: number;
  change24hPercent?: number;
  marketCap?: number;
  source: 'binance' | 'cryptocompare' | 'coingecko';
}

export interface PriceHistory {
  symbol: CryptoSymbol;
  prices: Array<{
    timestamp: Date;
    price: number;
    volume?: number;
  }>;
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
}

// ================================
// 게임 세션 타입
// ================================

export interface GameSession {
  id: string;
  userId: string;
  symbol: CryptoSymbol;
  startTime: Date;
  endTime: Date;
  duration: number; // 예측 시간 (분)
  startPrice: number;
  endPrice?: number;
  prediction: PredictionType;
  result?: GameResult;
  score: number;
  multiplier: number; // 점수 배율
  status: GameStatus;
  priceChangePercent?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameRound {
  id: string;
  roundNumber: number;
  symbol: CryptoSymbol;
  startTime: Date;
  endTime: Date;
  predictionDeadline: Date;
  startPrice: number;
  endPrice?: number;
  status: GameStatus;
  participants: number;
  totalPredictions: {
    up: number;
    down: number;
  };
  prizePool: number;
  createdAt: Date;
}

// ================================
// 예측 및 참여 타입
// ================================

export interface UserPrediction {
  id: string;
  userId: string;
  gameSessionId: string;
  roundId?: string;
  symbol: CryptoSymbol;
  prediction: PredictionType;
  confidence: number; // 1-100 신뢰도
  stakeAmount?: number; // 베팅 금액 (향후 확장)
  submittedAt: Date;
  isCorrect?: boolean;
  pointsEarned: number;
}

export interface GameParticipation {
  userId: string;
  gameSessionId: string;
  joinedAt: Date;
  predictions: UserPrediction[];
  totalScore: number;
  correctPredictions: number;
  totalPredictions: number;
  accuracy: number; // 정확도 %
  rank?: number;
}

// ================================
// 점수 및 랭킹 타입
// ================================

export interface ScoreCalculation {
  baseScore: number;        // 기본 점수
  timeBonus: number;        // 시간 보너스
  difficultyBonus: number;  // 난이도 보너스
  streakBonus: number;      // 연속 성공 보너스
  accuracyBonus: number;    // 정확도 보너스
  totalScore: number;
}

export interface UserStats {
  userId: string;
  totalGames: number;
  totalScore: number;
  correctPredictions: number;
  accuracy: number;
  bestStreak: number;
  currentStreak: number;
  averageScore: number;
  favoriteSymbol: CryptoSymbol;
  lastPlayedAt: Date;
  rank: number;
  tier: UserTier;
}

export enum UserTier {
  BRONZE = 'bronze',
  SILVER = 'silver', 
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
  MASTER = 'master'
}

// ================================
// 랭킹 시스템 타입
// ================================

export enum RankingPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ALL_TIME = 'all_time'
}

export interface RankingEntry {
  rank: number;
  userId: string;
  nickname: string;
  profileImage?: string;
  score: number;
  gamesPlayed: number;
  accuracy: number;
  tier: UserTier;
  change: number; // 순위 변동 (+3, -1, 0 등)
}

export interface Leaderboard {
  period: RankingPeriod;
  category: 'overall' | CryptoSymbol;
  rankings: RankingEntry[];
  totalParticipants: number;
  lastUpdated: Date;
  nextUpdate: Date;
}

// ================================
// 에어드롭 및 보상 타입
// ================================

export enum AirdropTier {
  TIER_1 = 1, // 1등 1명
  TIER_2 = 2, // 2등 50명  
  TIER_3 = 3, // 3등 500명
  TIER_4 = 4  // 4등 1000명
}

export interface AirdropReward {
  tier: AirdropTier;
  rank: number;
  amount: number; // CTA 토큰 양
  recipients: number; // 해당 티어 수상자 수
  totalAmount: number; // 해당 티어 총 지급량
}

export interface AirdropDistribution {
  id: string;
  period: RankingPeriod;
  distributionDate: Date;
  totalRecipients: number;
  totalAmount: number;
  rewards: AirdropReward[];
  transactionHash?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export interface UserAirdrop {
  id: string;
  userId: string;
  distributionId: string;
  tier: AirdropTier;
  rank: number;
  amount: number;
  status: 'pending' | 'sent' | 'claimed' | 'failed';
  transactionHash?: string;
  claimedAt?: Date;
  createdAt: Date;
}

// ================================
// 게임 설정 타입
// ================================

export interface GameConfiguration {
  minPredictionTime: number; // 최소 예측 시간 (분)
  maxPredictionTime: number; // 최대 예측 시간 (분)
  defaultPredictionTime: number; // 기본 예측 시간 (분)
  availableSymbols: CryptoSymbol[];
  scoreMultipliers: {
    [key in PredictionType]: number;
  };
  tierRequirements: {
    [key in UserTier]: {
      minScore: number;
      minAccuracy: number;
      minGames: number;
    };
  };
  airdropSchedule: {
    period: RankingPeriod;
    rewards: AirdropReward[];
    distributionDay: number; // 0=일요일, 1=월요일, ...
  };
}

// ================================
// API 요청/응답 타입
// ================================

export interface StartGameRequest {
  userId: string;
  symbol: CryptoSymbol;
  duration: number; // 분
}

export interface StartGameResponse {
  success: boolean;
  gameSession: GameSession;
  currentPrice: PriceData;
  expiresAt: Date;
}

export interface SubmitPredictionRequest {
  gameSessionId: string;
  prediction: PredictionType;
  confidence?: number;
}

export interface SubmitPredictionResponse {
  success: boolean;
  prediction: UserPrediction;
  gameSession: GameSession;
  timeRemaining: number; // 초
}

export interface GameResultRequest {
  gameSessionId: string;
}

export interface GameResultResponse {
  success: boolean;
  gameSession: GameSession;
  result: GameResult;
  scoreCalculation: ScoreCalculation;
  finalPrice: PriceData;
  priceChange: {
    amount: number;
    percentage: number;
  };
  userStats: UserStats;
}

export interface LeaderboardRequest {
  period: RankingPeriod;
  category?: 'overall' | CryptoSymbol;
  limit?: number;
  offset?: number;
}

export interface LeaderboardResponse {
  success: boolean;
  leaderboard: Leaderboard;
  userRank?: RankingEntry;
}

export interface UserStatsRequest {
  userId: string;
  period?: RankingPeriod;
}

export interface UserStatsResponse {
  success: boolean;
  stats: UserStats;
  recentGames: GameSession[];
  achievements: Achievement[];
}

// ================================
// 게임 이벤트 타입
// ================================

export enum GameEventType {
  GAME_STARTED = 'game_started',
  PREDICTION_SUBMITTED = 'prediction_submitted',
  GAME_ENDED = 'game_ended',
  PRICE_UPDATE = 'price_update',
  RANKING_UPDATE = 'ranking_update',
  AIRDROP_DISTRIBUTED = 'airdrop_distributed'
}

export interface GameEvent {
  type: GameEventType;
  payload: any;
  timestamp: Date;
  userId?: string;
  gameSessionId?: string;
}

// ================================
// 업적 시스템 타입
// ================================

export enum AchievementType {
  FIRST_WIN = 'first_win',
  WINNING_STREAK = 'winning_streak',
  ACCURACY_MASTER = 'accuracy_master',
  VOLUME_TRADER = 'volume_trader',
  SYMBOL_SPECIALIST = 'symbol_specialist',
  RANK_CLIMBER = 'rank_climber'
}

export interface Achievement {
  id: string;
  type: AchievementType;
  title: string;
  description: string;
  icon: string;
  requirement: {
    type: string;
    value: number;
    symbol?: CryptoSymbol;
  };
  reward: {
    points: number;
    badge?: string;
  };
  unlockedAt?: Date;
}

export interface UserAchievement {
  userId: string;
  achievementId: string;
  progress: number;
  isCompleted: boolean;
  completedAt?: Date;
  claimedAt?: Date;
}