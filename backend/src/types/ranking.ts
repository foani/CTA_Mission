// backend/src/types/ranking.ts

/**
 * 랭킹 기간 타입
 */
export type RankingPeriod = 'daily' | 'weekly' | 'monthly' | 'all';

/**
 * 에어드롭 등급 (1등급이 가장 높음)
 */
export type AirdropTier = 0 | 1 | 2 | 3 | 4;

/**
 * 사용자 점수 정보
 */
export interface UserScore {
  userId: string;
  totalScore: number;
  averageScore: number;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  winStreak: number;
  maxWinStreak: number;
  averageAccuracy: number;
  participationScore: number;
  consistencyBonus: number;
  period: RankingPeriod;
  calculatedAt: Date;
}

/**
 * 웹소켓 이벤트 타입들
 */
export interface WebSocketEvents {
  'join-leaderboard': {
    period: RankingPeriod;
    userId?: string;
  };
}

/**
 * 리더보드 아이템
 */
export interface LeaderboardItem {
  rank: number;
  userId: string;
  username: string;
  totalScore: number;
  winRate: number;
  totalGames: number;
  rankChange: number;
  isOnline?: boolean;
  airdropTier?: AirdropTier;
}