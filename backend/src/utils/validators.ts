/**
 * Validators Utility
 * 미션 검증 로직을 처리하는 유틸리티 함수들
 * 
 * 주요 기능:
 * - 크리에이타 월렛 설치 검증
 * - 홈페이지 방문 검증 (10초 체류 확인)
 * - 요청 데이터 검증
 */

import { logger } from './logger';
import { AppError } from '../middlewares/errorHandler';
import { ValidationSchema } from '../types/common.types';
import { DeviceInfo } from '../types/common.types';

// 방문 토큰 저장소 (실제 환경에서는 Redis 사용 권장)
interface VisitToken {
  userId: string;
  token: string;
  startTime: Date;
  isValid: boolean;
}

// 메모리 저장소 (임시 - 추후 Redis로 변경)
const visitTokens: Map<string, VisitToken> = new Map();

/**
 * 크리에이타 월렛 설치 검증
 * @param userId 사용자 ID
 * @param deviceInfo 기기 정보 (선택적)
 * @returns 설치 검증 결과
 */
export async function validateWalletInstallation(
  userId: string, 
  deviceInfo?: any
): Promise<boolean> {
  try {
    logger.info(`Validating wallet installation for user: ${userId}`, { deviceInfo });

    // TODO: 실제 Google Play Store API 또는 기타 방법으로 검증
    // 현재는 기본적인 검증 로직 구현
    
    // 1. 기기 정보 검증 (선택적)
    if (deviceInfo) {
      const { platform, version } = deviceInfo;
      
      // Android 플랫폼 확인
      if (platform && platform.toLowerCase() !== 'android') {
        logger.warn(`Non-Android platform detected for user ${userId}: ${platform}`);
        return false;
      }
      
      // 최소 안드로이드 버전 확인 (예: Android 6.0 이상)
      if (version && parseFloat(version) < 6.0) {
        logger.warn(`Unsupported Android version for user ${userId}: ${version}`);
        return false;
      }
    }

    // 2. 사용자별 설치 시뮬레이션
    // 실제 환경에서는 다음 중 하나를 사용:
    // - Google Play Install Referrer API
    // - 앱 내 특수 토큰 확인
    // - 서버 측 설치 확인 로직

    // 임시 검증 로직: 사용자 ID 기반 확률적 검증
    const isInstalled = await simulateWalletInstallCheck(userId);
    
    if (isInstalled) {
      logger.info(`Wallet installation validated for user: ${userId}`);
      return true;
    } else {
      logger.warn(`Wallet installation not detected for user: ${userId}`);
      return false;
    }
    
  } catch (error) {
    logger.error('Error validating wallet installation:', error);
    return false;
  }
}

/**
 * 월렛 설치 확인 시뮬레이션 (개발용)
 * 실제 환경에서는 실제 API 호출로 대체
 * @param userId 사용자 ID
 * @returns 설치 여부
 */
async function simulateWalletInstallCheck(userId: string): Promise<boolean> {
  // 개발 환경에서는 항상 true 반환
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // 사용자 ID 해시 기반 결정론적 결과
  const hash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // 80% 확률로 설치됨으로 간주
  return Math.abs(hash) % 100 < 80;
}

/**
 * 홈페이지 방문 검증
 * @param userId 사용자 ID
 * @param visitToken 방문 토큰
 * @param visitDuration 방문 시간(초)
 * @returns 방문 검증 결과
 */
export async function validateHomepageVisit(
  userId: string,
  visitToken: string,
  visitDuration: number = 10
): Promise<boolean> {
  try {
    logger.info(`Validating homepage visit for user: ${userId}`, { 
      visitToken, 
      visitDuration 
    });

    // 1. 토큰 유효성 검증
    const tokenData = visitTokens.get(visitToken);
    
    if (!tokenData) {
      logger.warn(`Invalid visit token for user ${userId}: ${visitToken}`);
      return false;
    }

    if (tokenData.userId !== userId) {
      logger.warn(`Token user mismatch for user ${userId}. Token belongs to: ${tokenData.userId}`);
      return false;
    }

    if (!tokenData.isValid) {
      logger.warn(`Token already used or invalid for user ${userId}: ${visitToken}`);
      return false;
    }

    // 2. 방문 시간 검증
    const currentTime = new Date();
    const elapsedTime = (currentTime.getTime() - tokenData.startTime.getTime()) / 1000;
    
    if (elapsedTime < visitDuration) {
      logger.warn(`Insufficient visit duration for user ${userId}. Required: ${visitDuration}s, Actual: ${elapsedTime}s`);
      return false;
    }

    // 3. 최대 방문 시간 검증 (부정 방지)
    const maxVisitTime = 3600; // 1시간
    if (elapsedTime > maxVisitTime) {
      logger.warn(`Excessive visit duration for user ${userId}. Duration: ${elapsedTime}s`);
      return false;
    }

    // 4. 토큰 무효화 (중복 사용 방지)
    tokenData.isValid = false;
    visitTokens.set(visitToken, tokenData);

    logger.info(`Homepage visit validated for user: ${userId}. Duration: ${elapsedTime}s`);
    return true;

  } catch (error) {
    logger.error('Error validating homepage visit:', error);
    return false;
  }
}

/**
 * 홈페이지 방문 토큰 생성
 * @param userId 사용자 ID
 * @returns 방문 토큰
 */
export function generateVisitToken(userId: string): string {
  try {
    const timestamp = Date.now();
    const randomValue = Math.random().toString(36).substring(7);
    const token = `visit_${userId}_${timestamp}_${randomValue}`;
    
    // 토큰 저장
    const visitToken: VisitToken = {
      userId,
      token,
      startTime: new Date(),
      isValid: true
    };
    
    visitTokens.set(token, visitToken);
    
    // 토큰 자동 만료 (30분)
    setTimeout(() => {
      if (visitTokens.has(token)) {
        visitTokens.delete(token);
        logger.info(`Visit token expired and removed: ${token}`);
      }
    }, 30 * 60 * 1000);
    
    logger.info(`Visit token generated for user: ${userId}`, { token });
    return token;
    
  } catch (error) {
    logger.error('Error generating visit token:', error);
    throw new AppError('방문 토큰 생성에 실패했습니다', 500);
  }
}

/**
 * 요청 데이터 검증
 * @param data 검증할 데이터
 * @param schema 검증 스키마
 * @returns 검증 결과
 */
export function validateRequest<T>(data: T, schema: ValidationSchema): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  for (const [key, rules] of Object.entries(schema)) {
    const value = (data as Record<string, unknown>)[key];

    // 필수 필드 검사
    if (rules.required && (value === undefined || value === null)) {
      return false;
    }

    // 타입 검사
    if (value !== undefined && rules.type) {
      if (typeof value !== rules.type) {
        return false;
      }
    }

    // 문자열 길이 검사
    if (typeof value === 'string') {
      if (rules.maxLength && value.length > rules.maxLength) {
        return false;
      }
      if (rules.minLength && value.length < rules.minLength) {
        return false;
      }
    }

    // 패턴 검사
    if (rules.pattern && typeof value === 'string') {
      if (!rules.pattern.test(value)) {
        return false;
      }
    }

    // 열거형 검사
    if (rules.enum && !rules.enum.includes(value as string)) {
      return false;
    }
  }

  return true;
}

/**
 * 이메일 형식 검증
 * @param email 이메일 주소
 * @returns 유효한 이메일 여부
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 지갑 주소 형식 검증 (Ethereum 기반)
 * @param address 지갑 주소
 * @returns 유효한 주소 여부
 */
export function validateWalletAddress(address: string): boolean {
  const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethereumAddressRegex.test(address);
}

/**
 * 방문 토큰 정리 (메모리 관리)
 * 주기적으로 호출하여 만료된 토큰 제거
 */
export function cleanupExpiredTokens(): void {
  const now = new Date();
  const maxAge = 30 * 60 * 1000; // 30분
  
  let removedCount = 0;
  Array.from(visitTokens.entries()).forEach(([token, data]) => {
    const age = now.getTime() - data.startTime.getTime();
    if (age > maxAge) {
      visitTokens.delete(token);
      removedCount++;
    }
  });
  
  if (removedCount > 0) {
    logger.info(`Cleaned up ${removedCount} expired visit tokens`);
  }
}

// 토큰 정리 스케줄러 (15분마다 실행)
setInterval(cleanupExpiredTokens, 15 * 60 * 1000);

/**
 * 개발용 유틸리티 함수들
 */
export const DevUtils = {
  /**
   * 모든 방문 토큰 조회 (개발용)
   */
  getAllVisitTokens(): VisitToken[] {
    return Array.from(visitTokens.values());
  },
  
  /**
   * 특정 사용자의 토큰 조회 (개발용)
   */
  getUserTokens(userId: string): VisitToken[] {
    return Array.from(visitTokens.values()).filter(token => token.userId === userId);
  },
  
  /**
   * 토큰 강제 삭제 (개발용)
   */
  removeToken(token: string): boolean {
    return visitTokens.delete(token);
  },
  
  /**
   * 모든 토큰 삭제 (개발용)
   */
  clearAllTokens(): void {
    visitTokens.clear();
  }
};

export function validateDeviceInfo(deviceInfo: DeviceInfo): boolean {
  if (!deviceInfo) return false;
  
  const { platform, version, model } = deviceInfo;
  
  if (!platform || typeof platform !== 'string') return false;
  if (!version || typeof version !== 'string') return false;
  if (model && typeof model !== 'string') return false;
  
  return true;
}

export function validateMissionRequest<T extends Record<string, unknown>>(
  data: T,
  schema: ValidationSchema
): void {
  if (!validateRequest(data, schema)) {
    throw new AppError('Invalid request data', 400, true, 'INVALID_REQUEST_DATA');
  }
}