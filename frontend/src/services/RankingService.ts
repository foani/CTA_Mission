import axios, { type AxiosResponse } from 'axios';

// 환경 변수 타입 안전성 확보
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * 랭킹 기준 메트릭
 */
export type RankingMetric = 'totalScore' | 'winRate' | 'gamesPlayed' | 'avgScore';

/**
 * 랭킹 조회 기간
 */
export type RankingPeriod = 'daily' | 'weekly' | 'monthly' | 'all';

/**
 * 에어드롭 상태
 */
export type AirdropStatus = 'pending' | 'completed' | 'failed';

/**
 * 사용자 랭킹 정보
 */
export interface UserRanking {
  id: string;
  userId: string;
  username: string;
  walletAddress: string;
  score: number;
  rank: number;
  gamesPlayed: number;
  winRate: number;
  lastActive: string;
  avatar?: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
  totalScore: number;
  avgScore: number;
  period: RankingPeriod;
}

/**
 * 랭킹 조회 옵션
 */
export interface RankingOptions {
  limit?: number;
  offset?: number;
  period?: RankingPeriod;
  metric?: RankingMetric;
  userId?: string;
}

/**
 * 에어드롭 정보
 */
export interface AirdropInfo {
  id: string;
  userId: string;
  username: string;
  walletAddress: string;
  rank: number;
  amount: string; // CTA 토큰 양
  txHash?: string;
  status: AirdropStatus;
  period: 'weekly' | 'monthly';
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

/**
 * 에어드롭 스케줄 정보
 */
export interface AirdropSchedule {
  nextWeeklyAirdrop: string;
  nextMonthlyAirdrop: string;
  weeklyPrizePool: string;
  monthlyPrizePool: string;
  eligibleUsersCount: number;
  lastAirdropDate?: string;
}

/**
 * 시즌 정보
 */
export interface SeasonInfo {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  prizePool: string;
  status: 'upcoming' | 'active' | 'ended';
  participantsCount: number;
}

/**
 * 리더보드 정보
 */
export interface LeaderboardData {
  topUsers: UserRanking[];
  currentUserRank?: UserRanking;
  totalParticipants: number;
  lastUpdated: string;
}

/**
 * 랭킹 통계
 */
export interface RankingStats {
  totalUsers: number;
  totalGames: number;
  averageScore: number;
  topScore: number;
  totalAirdrops: number;
  totalAirdropAmount: string;
}

/**
 * 백엔드 표준 응답 구조
 */
interface StandardApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

/**
 * 백엔드 페이지네이션 응답
 */
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 랭킹 서비스 클래스
 */
export class RankingService {
  private static instance: RankingService;
  private rankingCache = new Map<string, UserRanking[]>();
  private leaderboardCache = new Map<string, LeaderboardData>();
  private readonly CACHE_DURATION = 60000; // 1분
  private authToken: string | null = null;
  private cacheTimestamps = new Map<string, number>();

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): RankingService {
    if (!RankingService.instance) {
      RankingService.instance = new RankingService();
    }
    return RankingService.instance;
  }

  private constructor() {
    // 로컬 스토리지에서 인증 토큰 로드 (브라우저 환경에서만)
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      this.authToken = localStorage.getItem('authToken');
    }
  }

  /**
   * 인증 토큰 설정
   */
  public setAuthToken(token: string): void {
    this.authToken = token;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  /**
   * 인증 헤더 생성
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    return headers;
  }

  /**
   * 랭킹 조회 (기간별)
   */
  public async getRanking(options: RankingOptions = {}): Promise<UserRanking[]> {
    try {
      const {
        limit = 100,
        offset = 0,
        period = 'weekly',
        metric = 'totalScore',
        userId
      } = options;

      const cacheKey = `${period}_${metric}_${limit}_${offset}_${userId || ''}`;
      const cached = this.rankingCache.get(cacheKey);
      
      if (cached && this.isCacheValid(cacheKey)) {
        return cached;
      }

      // 기간별 엔드포인트 결정
      let endpoint = '';
      switch (period) {
        case 'daily':
          endpoint = '/api/ranking/daily';
          break;
        case 'weekly':
          endpoint = '/api/ranking/weekly';
          break;
        case 'monthly':
          endpoint = '/api/ranking/monthly';
          break;
        case 'all':
          endpoint = '/api/ranking/all-time';
          break;
        default:
          endpoint = '/api/ranking/weekly';
      }

      const response: AxiosResponse<StandardApiResponse<PaginatedResponse<UserRanking>>> = await axios.get(
        `${API_BASE_URL}${endpoint}`,
        {
          timeout: 15000,
          headers: this.getAuthHeaders(),
          params: {
            limit: limit.toString(),
            offset: offset.toString(),
            metric,
            ...(userId && { userId })
          }
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(`Ranking API Error: ${response.data.error || 'Failed to fetch ranking data'}`);
      }

      const rankings = response.data.data.items || [];
      this.rankingCache.set(cacheKey, rankings);
      this.cacheTimestamps.set(cacheKey, Date.now());
      
      return rankings;
    } catch (error) {
      console.error('Failed to fetch ranking:', error);
      return this.getDefaultRankingData();
    }
  }

  /**
   * 특정 사용자 랭킹 조회
   */
  public async getUserRanking(userId: string, period: RankingPeriod = 'weekly'): Promise<UserRanking | null> {
    try {
      const response: AxiosResponse<StandardApiResponse<UserRanking>> = await axios.get(
        `${API_BASE_URL}/api/ranking/user/${userId}`,
        {
          timeout: 10000,
          headers: this.getAuthHeaders(),
          params: { period }
        }
      );

      if (!response.data.success || !response.data.data) {
        return null;
      }

      return response.data.data;
    } catch (error) {
      console.error(`Failed to fetch user ranking for ${userId}:`, error);
      return null;
    }
  }

  /**
   * 내 랭킹 정보 조회
   */
  public async getMyRanking(period: RankingPeriod = 'weekly'): Promise<UserRanking | null> {
    try {
      if (!this.authToken) {
        throw new Error('Authentication required');
      }

      const response: AxiosResponse<StandardApiResponse<UserRanking>> = await axios.get(
        `${API_BASE_URL}/api/ranking/my-rank`,
        {
          timeout: 10000,
          headers: this.getAuthHeaders(),
          params: { period }
        }
      );

      if (!response.data.success || !response.data.data) {
        return null;
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch my ranking:', error);
      return null;
    }
  }

  /**
   * 상위 리더보드 조회
   */
  public async getTopLeaderboard(
    period: RankingPeriod = 'weekly',
    limit: number = 10
  ): Promise<LeaderboardData> {
    try {
      const cacheKey = `leaderboard_${period}_${limit}`;
      const cached = this.leaderboardCache.get(cacheKey);
      
      if (cached && this.isCacheValid(cacheKey)) {
        return cached;
      }

      const response: AxiosResponse<StandardApiResponse<LeaderboardData>> = await axios.get(
        `${API_BASE_URL}/api/ranking/leaderboard/top`,
        {
          timeout: 10000,
          headers: this.getAuthHeaders(),
          params: {
            period,
            limit: limit.toString()
          }
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(`Leaderboard API Error: ${response.data.error || 'Failed to fetch leaderboard'}`);
      }

      const leaderboard = response.data.data;
      this.leaderboardCache.set(cacheKey, leaderboard);
      this.cacheTimestamps.set(cacheKey, Date.now());
      
      return leaderboard;
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      return this.getDefaultLeaderboardData();
    }
  }

  /**
   * 에어드롭 스케줄 조회
   */
  public async getAirdropSchedule(): Promise<AirdropSchedule> {
    try {
      const response: AxiosResponse<StandardApiResponse<AirdropSchedule>> = await axios.get(
        `${API_BASE_URL}/api/ranking/airdrop/schedule`,
        {
          timeout: 10000,
          headers: this.getAuthHeaders()
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(`Airdrop Schedule API Error: ${response.data.error || 'Failed to fetch schedule'}`);
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch airdrop schedule:', error);
      return this.getDefaultAirdropSchedule();
    }
  }

  /**
   * 에어드롭 히스토리 조회
   */
  public async getAirdropHistory(
    limit: number = 20,
    offset: number = 0,
    status?: AirdropStatus
  ): Promise<{ items: AirdropInfo[]; total: number }> {
    try {
      if (!this.authToken) {
        throw new Error('Authentication required');
      }

      const response: AxiosResponse<StandardApiResponse<PaginatedResponse<AirdropInfo>>> = await axios.get(
        `${API_BASE_URL}/api/ranking/airdrop/history`,
        {
          timeout: 15000,
          headers: this.getAuthHeaders(),
          params: {
            limit: limit.toString(),
            offset: offset.toString(),
            ...(status && { status })
          }
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(`Airdrop History API Error: ${response.data.error || 'Failed to fetch history'}`);
      }

      const data = response.data.data;
      return {
        items: data.items || [],
        total: data.total || 0
      };
    } catch (error) {
      console.error('Failed to fetch airdrop history:', error);
      return { items: [], total: 0 };
    }
  }

  /**
   * 내 에어드롭 히스토리 조회
   */
  public async getMyAirdropHistory(
    limit: number = 20,
    offset: number = 0,
    status?: AirdropStatus
  ): Promise<{ items: AirdropInfo[]; total: number }> {
    try {
      if (!this.authToken) {
        throw new Error('Authentication required');
      }

      const response: AxiosResponse<StandardApiResponse<PaginatedResponse<AirdropInfo>>> = await axios.get(
        `${API_BASE_URL}/api/ranking/airdrop/my-history`,
        {
          timeout: 15000,
          headers: this.getAuthHeaders(),
          params: {
            limit: limit.toString(),
            offset: offset.toString(),
            ...(status && { status })
          }
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(`My Airdrop History API Error: ${response.data.error || 'Failed to fetch my history'}`);
      }

      const data = response.data.data;
      return {
        items: data.items || [],
        total: data.total || 0
      };
    } catch (error) {
      console.error('Failed to fetch my airdrop history:', error);
      return { items: [], total: 0 };
    }
  }

  /**
   * 현재 시즌 정보 조회
   */
  public async getCurrentSeason(): Promise<SeasonInfo | null> {
    try {
      const response: AxiosResponse<StandardApiResponse<SeasonInfo>> = await axios.get(
        `${API_BASE_URL}/api/ranking/season/current`,
        {
          timeout: 10000,
          headers: this.getAuthHeaders()
        }
      );

      if (!response.data.success || !response.data.data) {
        return null;
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch current season:', error);
      return null;
    }
  }

  /**
   * 시즌 히스토리 조회
   */
  public async getSeasonHistory(limit: number = 10): Promise<SeasonInfo[]> {
    try {
      const response: AxiosResponse<StandardApiResponse<SeasonInfo[]>> = await axios.get(
        `${API_BASE_URL}/api/ranking/season/history`,
        {
          timeout: 10000,
          headers: this.getAuthHeaders(),
          params: { limit: limit.toString() }
        }
      );

      if (!response.data.success || !response.data.data) {
        return [];
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch season history:', error);
      return [];
    }
  }

  /**
   * 랭킹 통계 조회
   */
  public async getRankingStats(): Promise<RankingStats> {
    try {
      const response: AxiosResponse<StandardApiResponse<RankingStats>> = await axios.get(
        `${API_BASE_URL}/api/ranking/stats/overview`,
        {
          timeout: 10000,
          headers: this.getAuthHeaders()
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(`Ranking Stats API Error: ${response.data.error || 'Failed to fetch stats'}`);
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch ranking stats:', error);
      return this.getDefaultRankingStats();
    }
  }

  /**
   * 캐시 유효성 검사
   */
  private isCacheValid(cacheKey: string): boolean {
    const now = Date.now();
    const lastFetched = this.cacheTimestamps.get(cacheKey) || 0;
    return (now - lastFetched) < this.CACHE_DURATION;
  }

  /**
   * 기본 랭킹 데이터 생성
   */
  private getDefaultRankingData(): UserRanking[] {
    return Array.from({ length: 10 }, (_, i) => ({
      id: `default_${i}`,
      userId: `user_${i}`,
      username: `Player ${i + 1}`,
      walletAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
      score: 1000 - i * 100,
      rank: i + 1,
      gamesPlayed: 50 - i * 5,
      winRate: 0.8 - i * 0.05,
      lastActive: new Date().toISOString(),
      tier: i < 2 ? 'Diamond' : i < 5 ? 'Gold' : 'Silver',
      totalScore: 1000 - i * 100,
      avgScore: 20 - i * 2,
      period: 'weekly'
    }));
  }

  /**
   * 기본 리더보드 데이터 생성
   */
  private getDefaultLeaderboardData(): LeaderboardData {
    return {
      topUsers: this.getDefaultRankingData().slice(0, 5),
      totalParticipants: 1000,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 기본 에어드롭 스케줄 생성
   */
  private getDefaultAirdropSchedule(): AirdropSchedule {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      nextWeeklyAirdrop: nextWeek.toISOString(),
      nextMonthlyAirdrop: nextMonth.toISOString(),
      weeklyPrizePool: '100000',
      monthlyPrizePool: '500000',
      eligibleUsersCount: 500
    };
  }

  /**
   * 기본 랭킹 통계 생성
   */
  private getDefaultRankingStats(): RankingStats {
    return {
      totalUsers: 1000,
      totalGames: 10000,
      averageScore: 500,
      topScore: 2000,
      totalAirdrops: 50,
      totalAirdropAmount: '1000000'
    };
  }

  /**
   * 캐시 클리어
   */
  public clearCache(): void {
    this.rankingCache.clear();
    this.leaderboardCache.clear();
  }

  /**
   * 서비스 정리
   */
  public destroy(): void {
    this.clearCache();
    this.authToken = null;
  }
}

// 싱글톤 인스턴스 export
export const rankingService = RankingService.getInstance();