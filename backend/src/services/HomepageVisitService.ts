import { logger } from '../utils/logger';
import { DeviceInfo } from '../types/common.types';

/**
 * 홈페이지 방문 확인 서비스
 * CreataChain 홈페이지 10초 이상 체류 확인
 */
export class HomepageVisitService {
  private readonly CREATA_HOMEPAGE_URL = 'https://creatachain.com';
  private readonly MIN_VISIT_DURATION = 10000; // 10초
  private readonly MAX_TOKEN_AGE = 300000; // 5분
  
  // 방문 세션 저장소 (실제로는 Redis 사용 권장)
  private visitSessions = new Map<string, VisitSession>();
  
  /**
   * 홈페이지 방문 세션 시작
   * @param userId 사용자 ID
   * @param deviceInfo 디바이스 정보
   * @returns 방문 토큰
   */
  async startVisitSession(userId: string, deviceInfo: DeviceInfo): Promise<VisitSessionResult> {
    try {
      logger.info(`홈페이지 방문 세션 시작 - 사용자: ${userId}`);
      
      // 기존 세션이 있는지 확인
      const existingToken = this.findExistingSession(userId);
      if (existingToken) {
        logger.info(`기존 방문 세션 발견 - 토큰: ${existingToken}`);
        return {
          success: true,
          visitToken: existingToken,
          message: '기존 방문 세션을 계속 사용합니다.',
          homepageUrl: this.CREATA_HOMEPAGE_URL,
          minDuration: this.MIN_VISIT_DURATION
        };
      }
      
      // 새로운 방문 토큰 생성
      const visitToken = this.generateVisitToken(userId, deviceInfo);
      
      // 방문 세션 생성
      const session: VisitSession = {
        userId,
        visitToken,
        deviceInfo,
        startTime: Date.now(),
        isActive: true,
        pageViews: [],
        totalDuration: 0,
        verified: false
      };
      
      // 세션 저장
      this.visitSessions.set(visitToken, session);
      
      // 자동 정리 타이머 설정 (5분 후)
      setTimeout(() => {
        this.cleanupSession(visitToken);
      }, this.MAX_TOKEN_AGE);
      
      logger.info(`새 방문 세션 생성 - 토큰: ${visitToken}`);
      
      return {
        success: true,
        visitToken,
        message: 'CreataChain 홈페이지를 10초 이상 방문해주세요.',
        homepageUrl: this.CREATA_HOMEPAGE_URL,
        minDuration: this.MIN_VISIT_DURATION,
        instructions: [
          '1. 다음 링크를 클릭하여 CreataChain 홈페이지를 방문하세요',
          '2. 페이지에서 최소 10초 이상 머물러주세요',
          '3. 페이지를 둘러보며 CreataChain에 대해 알아보세요',
          '4. 10초가 지나면 자동으로 미션이 완료됩니다'
        ]
      };
    } catch (error) {
      logger.error(`홈페이지 방문 세션 시작 실패 - 사용자: ${userId}:`, error);
      return {
        success: false,
        message: '방문 세션 시작 중 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * 페이지 방문 이벤트 기록
   * @param visitToken 방문 토큰
   * @param pageUrl 방문한 페이지 URL
   * @param timestamp 방문 시간
   */
  async recordPageVisit(
    visitToken: string, 
    pageUrl: string, 
    timestamp?: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const session = this.visitSessions.get(visitToken);
      if (!session || !session.isActive) {
        return {
          success: false,
          message: '유효하지 않은 방문 토큰입니다.'
        };
      }
      
      const visitTime = timestamp || Date.now();
      
      // 페이지 방문 기록 추가
      session.pageViews.push({
        url: pageUrl,
        timestamp: visitTime,
        referrer: '',
        userAgent: session.deviceInfo.userAgent || ''
      });
      
      // CreataChain 홈페이지 방문인지 확인
      if (this.isCreataHomepage(pageUrl)) {
        session.homepageVisitTime = visitTime;
        logger.info(`CreataChain 홈페이지 방문 기록 - 토큰: ${visitToken}`);
      }
      
      return {
        success: true,
        message: '페이지 방문이 기록되었습니다.'
      };
    } catch (error) {
      logger.error(`페이지 방문 기록 실패 - 토큰: ${visitToken}:`, error);
      return {
        success: false,
        message: '페이지 방문 기록 중 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * 방문 세션 종료 및 검증
   * @param visitToken 방문 토큰
   * @returns 방문 검증 결과
   */
  async endVisitSession(visitToken: string): Promise<VisitVerificationResult> {
    try {
      const session = this.visitSessions.get(visitToken);
      if (!session) {
        return {
          isValid: false,
          reason: 'INVALID_TOKEN',
          message: '유효하지 않은 방문 토큰입니다.',
          duration: 0
        };
      }
      
      // 세션 종료 처리
      session.isActive = false;
      session.endTime = Date.now();
      
      // 총 방문 시간 계산
      session.totalDuration = session.endTime - session.startTime;
      
      // 홈페이지 방문 검증
      const verificationResult = this.verifyHomepageVisit(session);
      
      logger.info(`방문 세션 종료 - 토큰: ${visitToken}, 검증: ${verificationResult.isValid}`);
      
      return verificationResult;
    } catch (error) {
      logger.error(`방문 세션 종료 실패 - 토큰: ${visitToken}:`, error);
      return {
        isValid: false,
        reason: 'VERIFICATION_ERROR',
        message: '방문 검증 중 오류가 발생했습니다.',
        duration: 0
      };
    }
  }
  
  /**
   * 실시간 방문 상태 확인
   * @param visitToken 방문 토큰
   */
  async getVisitStatus(visitToken: string): Promise<VisitStatusResult> {
    try {
      const session = this.visitSessions.get(visitToken);
      if (!session) {
        return {
          exists: false,
          message: '유효하지 않은 방문 토큰입니다.'
        };
      }
      
      const currentTime = Date.now();
      const elapsed = currentTime - session.startTime;
      const progress = Math.min((elapsed / this.MIN_VISIT_DURATION) * 100, 100);
      
      const hasVisitedHomepage = session.pageViews.some(view => 
        this.isCreataHomepage(view.url)
      );
      
      return {
        exists: true,
        isActive: session.isActive,
        userId: session.userId,
        startTime: session.startTime,
        elapsed,
        progress,
        hasVisitedHomepage,
        isComplete: elapsed >= this.MIN_VISIT_DURATION && hasVisitedHomepage,
        remainingTime: Math.max(0, this.MIN_VISIT_DURATION - elapsed),
        pageViewCount: session.pageViews.length,
        message: this.getStatusMessage(elapsed, hasVisitedHomepage)
      };
    } catch (error) {
      logger.error(`방문 상태 확인 실패 - 토큰: ${visitToken}:`, error);
      return {
        exists: false,
        message: '방문 상태 확인 중 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * 홈페이지 방문 검증
   */
  private verifyHomepageVisit(session: VisitSession): VisitVerificationResult {
    const duration = session.totalDuration;
    
    // 최소 방문 시간 확인
    if (duration < this.MIN_VISIT_DURATION) {
      return {
        isValid: false,
        reason: 'INSUFFICIENT_DURATION',
        message: `최소 방문 시간(10초)을 충족하지 않습니다. (현재: ${Math.round(duration/1000)}초)`,
        duration,
        required: this.MIN_VISIT_DURATION
      };
    }
    
    // CreataChain 홈페이지 방문 확인
    const hasHomepageVisit = session.pageViews.some(view => 
      this.isCreataHomepage(view.url)
    );
    
    if (!hasHomepageVisit) {
      return {
        isValid: false,
        reason: 'NO_HOMEPAGE_VISIT',
        message: 'CreataChain 홈페이지 방문이 기록되지 않았습니다.',
        duration
      };
    }
    
    // 방문 패턴 검증 (봇 방지)
    const isValidPattern = this.validateVisitPattern(session);
    if (!isValidPattern) {
      return {
        isValid: false,
        reason: 'INVALID_PATTERN',
        message: '비정상적인 방문 패턴이 감지되었습니다.',
        duration
      };
    }
    
    // 모든 검증 통과
    session.verified = true;
    
    return {
      isValid: true,
      reason: 'VERIFIED',
      message: 'CreataChain 홈페이지 방문이 성공적으로 확인되었습니다.',
      duration,
      metadata: {
        pageViews: session.pageViews.length,
        verificationTime: Date.now(),
        deviceInfo: session.deviceInfo
      }
    };
  }
  
  /**
   * 방문 패턴 검증 (봇 방지)
   */
  private validateVisitPattern(session: VisitSession): boolean {
    // 너무 짧은 시간에 너무 많은 페이지 방문은 봇일 가능성
    const avgTimePerPage = session.totalDuration / Math.max(session.pageViews.length, 1);
    if (avgTimePerPage < 1000 && session.pageViews.length > 5) { // 페이지당 1초 미만
      return false;
    }
    
    // 동일한 시간에 여러 페이지 방문은 비정상
    const timestamps = session.pageViews.map(view => view.timestamp);
    const uniqueTimestamps = new Set(timestamps);
    if (timestamps.length > uniqueTimestamps.size + 2) { // 2개까지는 허용
      return false;
    }
    
    return true;
  }
  
  /**
   * CreataChain 홈페이지 URL 확인
   */
  private isCreataHomepage(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('creatachain.com');
    } catch {
      return url.includes('creatachain.com');
    }
  }
  
  /**
   * 기존 세션 찾기
   */
  private findExistingSession(userId: string): string | null {
    for (const [token, session] of this.visitSessions) {
      if (session.userId === userId && session.isActive) {
        return token;
      }
    }
    return null;
  }
  
  /**
   * 방문 토큰 생성
   */
  private generateVisitToken(userId: string, deviceInfo: DeviceInfo): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 8);
    const data = `${userId}:${deviceInfo.platform}:${timestamp}:${random}`;
    return Buffer.from(data).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substr(0, 16);
  }
  
  /**
   * 상태 메시지 생성
   */
  private getStatusMessage(elapsed: number, hasVisitedHomepage: boolean): string {
    const remainingSeconds = Math.max(0, Math.ceil((this.MIN_VISIT_DURATION - elapsed) / 1000));
    
    if (!hasVisitedHomepage) {
      return 'CreataChain 홈페이지를 방문해주세요.';
    }
    
    if (remainingSeconds > 0) {
      return `홈페이지에서 ${remainingSeconds}초 더 머물러주세요.`;
    }
    
    return '미션 완료! 홈페이지 방문이 확인되었습니다.';
  }
  
  /**
   * 세션 정리
   */
  private cleanupSession(visitToken: string): void {
    const session = this.visitSessions.get(visitToken);
    if (session) {
      logger.info(`방문 세션 정리 - 토큰: ${visitToken}`);
      this.visitSessions.delete(visitToken);
    }
  }
  
  /**
   * 만료된 세션들 일괄 정리
   */
  public cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [token, session] of this.visitSessions) {
      if (now - session.startTime > this.MAX_TOKEN_AGE) {
        this.visitSessions.delete(token);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info(`만료된 방문 세션 ${cleanedCount}개 정리 완료`);
    }
  }
}

// 타입 정의
export interface VisitSession {
  userId: string;
  visitToken: string;
  deviceInfo: DeviceInfo;
  startTime: number;
  endTime?: number;
  isActive: boolean;
  pageViews: PageView[];
  totalDuration: number;
  homepageVisitTime?: number;
  verified: boolean;
}

export interface PageView {
  url: string;
  timestamp: number;
  referrer: string;
  userAgent: string;
}

export interface VisitSessionResult {
  success: boolean;
  visitToken?: string;
  message: string;
  homepageUrl?: string;
  minDuration?: number;
  instructions?: string[];
}

export interface VisitVerificationResult {
  isValid: boolean;
  reason: string;
  message: string;
  duration: number;
  required?: number;
  metadata?: {
    pageViews?: number;
    verificationTime?: number;
    deviceInfo?: DeviceInfo;
  };
}

export interface VisitStatusResult {
  exists: boolean;
  isActive?: boolean;
  userId?: string;
  startTime?: number;
  elapsed?: number;
  progress?: number;
  hasVisitedHomepage?: boolean;
  isComplete?: boolean;
  remainingTime?: number;
  pageViewCount?: number;
  message: string;
}
