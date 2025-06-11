// 미션 관련 API 서비스
// src/services/missionService.ts

import {
  Mission,
  MissionListResponse,
  MissionClaimRequest,
  MissionClaimResponse,
  MissionProgressUpdateRequest,
  MissionProgressUpdateResponse,
  MissionSearchParams,
  MissionCategory,
  MissionType,
  MissionStatus,
  MissionVerifyRequest,
  MissionVerifyResponse,
  MissionStartRequest,
  MissionStartResponse
} from '../types/mission.types';

// API 기본 설정
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
const API_TIMEOUT = 10000; // 10초

interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

class MissionService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // 인증 토큰 설정
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  // HTTP 요청 헤더 생성
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  // HTTP 요청 공통 메서드
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP Error: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('요청 시간이 초과되었습니다');
        }
        throw error;
      }
      throw new Error('알 수 없는 오류가 발생했습니다');
    }
  }

  // GET 요청
  private async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST 요청
  private async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT 요청
  private async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PATCH 요청
  private async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE 요청
  private async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // === 미션 관련 API 메서드들 ===

  /**
   * 모든 미션 목록 조회
   */
  async getAllMissions(params?: MissionSearchParams): Promise<MissionListResponse> {
    const queryString = params ? this.buildQueryString(params) : '';
    return this.get<MissionListResponse>(`/missions${queryString}`);
  }

  /**
   * 사용자별 미션 목록 조회
   */
  async getUserMissions(
    userId: string,
    params?: MissionSearchParams
  ): Promise<MissionListResponse> {
    const queryString = params ? this.buildQueryString(params) : '';
    return this.get<MissionListResponse>(`/missions/user/${userId}${queryString}`);
  }

  /**
   * 특정 미션 상세 정보 조회
   */
  async getMissionById(missionId: string): Promise<Mission> {
    return this.get<Mission>(`/missions/${missionId}`);
  }

  /**
   * 미션 카테고리 목록 조회
   */
  async getMissionCategories(): Promise<MissionCategory[]> {
    return this.get<MissionCategory[]>('/missions/categories');
  }

  /**
   * 미션 시작
   */
  async startMission(missionId: string, userId: string): Promise<MissionStartResponse> {
    const requestData: MissionStartRequest = { missionId, userId };
    return this.post<MissionStartResponse>(`/missions/${missionId}/start`, requestData);
  }

  /**
   * 미션 진행률 업데이트
   */
  async updateMissionProgress(
    missionId: string,
    progressData: MissionProgressUpdateRequest
  ): Promise<MissionProgressUpdateResponse> {
    return this.patch<MissionProgressUpdateResponse>(
      `/missions/${missionId}/progress`,
      progressData
    );
  }

  /**
   * 미션 보상 수령
   */
  async claimMissionReward(
    missionId: string,
    claimData: MissionClaimRequest
  ): Promise<MissionClaimResponse> {
    return this.post<MissionClaimResponse>(`/missions/${missionId}/claim`, claimData);
  }

  /**
   * 데일리 미션 리셋 확인
   */
  async checkDailyMissionReset(userId: string): Promise<{ resetAvailable: boolean; nextReset: Date }> {
    return this.get<{ resetAvailable: boolean; nextReset: Date }>(
      `/missions/daily-reset/${userId}`
    );
  }

  /**
   * 미션 통계 조회
   */
  async getMissionStats(userId: string): Promise<{
    totalMissions: number;
    completedMissions: number;
    availableMissions: number;
    inProgressMissions: number;
    totalRewardsEarned: number;
    currentStreak: number;
  }> {
    return this.get(`/missions/stats/${userId}`);
  }

  /**
   * 지갑 설치 미션 검증
   */
  async verifyWalletInstallation(userId: string, walletAddress: string): Promise<MissionProgressUpdateResponse> {
    const verifyData: MissionVerifyRequest = {
      missionId: '', // 지갑 설치 미션 ID는 백엔드에서 자동 처리
      userId,
      verificationType: MissionType.WALLET_INSTALL,
      verificationData: { walletAddress }
    };
    return this.post<MissionProgressUpdateResponse>('/missions/verify/wallet-install', verifyData);
  }

  /**
   * 홈페이지 방문 미션 검증
   */
  async verifyHomepageVisit(userId: string, timestamp: number): Promise<MissionProgressUpdateResponse> {
    const verifyData: MissionVerifyRequest = {
      missionId: '', // 홈페이지 방문 미션 ID는 백엔드에서 자동 처리
      userId,
      verificationType: MissionType.HOMEPAGE_VISIT,
      verificationData: { timestamp }
    };
    return this.post<MissionProgressUpdateResponse>('/missions/verify/homepage-visit', verifyData);
  }

  /**
   * 소셜 팔로우 미션 검증
   */
  async verifySocialFollow(
    userId: string,
    platform: 'twitter' | 'telegram' | 'discord',
    username: string
  ): Promise<MissionProgressUpdateResponse> {
    const verifyData: MissionVerifyRequest = {
      missionId: '', // 소셜 팔로우 미션 ID는 백엔드에서 자동 처리
      userId,
      verificationType: MissionType.SOCIAL_FOLLOW,
      verificationData: { platform, username }
    };
    return this.post<MissionProgressUpdateResponse>('/missions/verify/social-follow', verifyData);
  }

  /**
   * 게임 플레이 미션 기록
   */
  async recordGamePlay(
    userId: string,
    gameType: string,
    score?: number,
    duration?: number
  ): Promise<MissionProgressUpdateResponse> {
    const verifyData: MissionVerifyRequest = {
      missionId: '', // 게임 플레이 미션 ID는 백엔드에서 자동 처리
      userId,
      verificationType: MissionType.GAME_PLAY,
      verificationData: { gameType, score, duration }
    };
    return this.post<MissionProgressUpdateResponse>('/missions/verify/game-play', verifyData);
  }

  /**
   * 예측 성공 미션 기록
   */
  async recordPredictionSuccess(
    userId: string,
    predictionId: string,
    isCorrect: boolean
  ): Promise<MissionProgressUpdateResponse> {
    const verifyData: MissionVerifyRequest = {
      missionId: '', // 예측 성공 미션 ID는 백엔드에서 자동 처리
      userId,
      verificationType: MissionType.PREDICTION_CORRECT,
      verificationData: { predictionId, isCorrect }
    };
    return this.post<MissionProgressUpdateResponse>('/missions/verify/prediction-correct', verifyData);
  }

  /**
   * 일일 로그인 미션 기록
   */
  async recordDailyLogin(userId: string): Promise<MissionProgressUpdateResponse> {
    const verifyData: MissionVerifyRequest = {
      missionId: '', // 일일 로그인 미션 ID는 백엔드에서 자동 처리
      userId,
      verificationType: MissionType.DAILY_LOGIN,
      verificationData: { timestamp: Date.now() }
    };
    return this.post<MissionProgressUpdateResponse>('/missions/verify/daily-login', verifyData);
  }

  // === 유틸리티 메서드들 ===

  /**
   * 쿼리 스트링 생성
   */
  private buildQueryString(params: MissionSearchParams): string {
    const searchParams = new URLSearchParams();

    if (params.query) searchParams.append('query', params.query);
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());

    // 필터 파라미터 처리
    if (params.filter) {
      const { filter } = params;
      
      if (filter.status) {
        filter.status.forEach(status => searchParams.append('status', status));
      }
      if (filter.type) {
        filter.type.forEach(type => searchParams.append('type', type));
      }
      if (filter.difficulty) {
        filter.difficulty.forEach(difficulty => searchParams.append('difficulty', difficulty));
      }
      if (filter.category) {
        filter.category.forEach(category => searchParams.append('category', category));
      }
      if (filter.isDaily !== undefined) {
        searchParams.append('isDaily', filter.isDaily.toString());
      }
      if (filter.isWeekly !== undefined) {
        searchParams.append('isWeekly', filter.isWeekly.toString());
      }
      if (filter.isMonthly !== undefined) {
        searchParams.append('isMonthly', filter.isMonthly.toString());
      }
      if (filter.available !== undefined) {
        searchParams.append('available', filter.available.toString());
      }
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * 미션 타입별 검증 메서드 호출
   */
  async verifyMissionByType(
    missionId: string,
    userId: string,
    missionType: MissionType,
    metadata?: Record<string, any>
  ): Promise<MissionVerifyResponse> {
    const verifyData: MissionVerifyRequest = {
      missionId,
      userId,
      verificationType: missionType,
      verificationData: metadata || {}
    };
    return this.post<MissionVerifyResponse>(`/missions/${missionId}/verify`, verifyData);
  }

  /**
   * 에러 핸들링 헬퍼
   */
  static handleApiError(error: any): ApiError {
    if (error instanceof Error) {
      return {
        message: error.message,
        code: 'API_ERROR',
      };
    }
    
    return {
      message: '알 수 없는 오류가 발생했습니다',
      code: 'UNKNOWN_ERROR',
    };
  }

  /**
   * 미션 상태 변경 (관리자용)
   */
  async updateMissionStatus(
    missionId: string,
    userId: string,
    newStatus: MissionStatus
  ): Promise<MissionProgressUpdateResponse> {
    return this.patch<MissionProgressUpdateResponse>(`/missions/${missionId}/status`, {
      userId,
      status: newStatus
    });
  }

  /**
   * 사용자의 모든 미션 진행률 초기화 (관리자용)
   */
  async resetUserMissions(userId: string): Promise<{ success: boolean; message: string }> {
    return this.post<{ success: boolean; message: string }>(`/missions/reset/${userId}`, {});
  }

  /**
   * 미션 완료 강제 처리 (관리자용)
   */
  async forceMissionCompletion(
    missionId: string,
    userId: string,
    reason: string
  ): Promise<MissionProgressUpdateResponse> {
    return this.post<MissionProgressUpdateResponse>(`/missions/${missionId}/force-complete`, {
      userId,
      reason
    });
  }
}

// 싱글톤 인스턴스 생성
const missionService = new MissionService();

export default missionService;
export { MissionService, type ApiError };