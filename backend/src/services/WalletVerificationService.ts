import axios from 'axios';
import { logger } from '../utils/logger';
import { DeviceInfo } from '../types/common.types';

/**
 * 지갑 설치 확인 서비스
 * Google Play Store API 및 대안 방법을 사용하여 Creata Wallet 설치 확인
 */
export class WalletVerificationService {
  private readonly CREATA_WALLET_PACKAGE_ID = 'com.creatachain.wallet';
  private readonly GOOGLE_PLAY_BASE_URL = 'https://play.google.com/store/apps/details';
  
  /**
   * 지갑 설치 확인 메인 메서드
   * @param userId 사용자 ID
   * @param deviceInfo 디바이스 정보
   * @returns Promise<WalletVerificationResult>
   */
  async verifyWalletInstallation(
    userId: string, 
    deviceInfo: DeviceInfo
  ): Promise<WalletVerificationResult> {
    try {
      logger.info(`지갑 설치 확인 시작 - 사용자: ${userId}`);
      
      // 1. 디바이스 정보 검증
      if (!this.validateDeviceInfo(deviceInfo)) {
        return {
          isInstalled: false,
          reason: 'INVALID_DEVICE_INFO',
          message: '유효하지 않은 디바이스 정보입니다.'
        };
      }

      // 2. 플랫폼별 확인 방법 선택
      const verificationMethod = this.selectVerificationMethod(deviceInfo);
      logger.info(`선택된 확인 방법: ${verificationMethod}`);

      let result: WalletVerificationResult;

      switch (verificationMethod) {
        case 'ANDROID_DIRECT':
          result = await this.verifyAndroidDirect(deviceInfo);
          break;
        case 'PLAY_STORE_API':
          result = await this.verifyViaPlayStoreAPI(deviceInfo);
          break;
        case 'USER_ATTESTATION':
          result = await this.verifyViaUserAttestation(userId, deviceInfo);
          break;
        default:
          result = await this.verifyFallback(deviceInfo);
      }

      // 3. 결과 로깅
      logger.info(`지갑 설치 확인 결과 - 사용자: ${userId}, 설치됨: ${result.isInstalled}`);
      
      return result;
    } catch (error) {
      logger.error(`지갑 설치 확인 실패 - 사용자: ${userId}:`, error);
      return {
        isInstalled: false,
        reason: 'VERIFICATION_ERROR',
        message: '지갑 설치 확인 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 디바이스 정보 유효성 검증
   */
  private validateDeviceInfo(deviceInfo: DeviceInfo): boolean {
    if (!deviceInfo) return false;
    
    // 필수 필드 확인
    const requiredFields = ['platform', 'userAgent'];
    return requiredFields.every(field => 
      deviceInfo[field as keyof DeviceInfo] !== undefined && 
      deviceInfo[field as keyof DeviceInfo] !== null
    );
  }

  /**
   * 확인 방법 선택
   */
  private selectVerificationMethod(deviceInfo: DeviceInfo): VerificationMethod {
    const platform = deviceInfo.platform?.toLowerCase();
    
    // Android 디바이스인 경우
    if (platform?.includes('android')) {
      // Android API Level이 높고 필요한 권한이 있는 경우 직접 확인
      if (deviceInfo.androidApiLevel && deviceInfo.androidApiLevel >= 28) {
        return 'ANDROID_DIRECT';
      }
      // 그렇지 않으면 Play Store API 사용
      return 'PLAY_STORE_API';
    }
    
    // iOS의 경우 사용자 증명 방식 사용
    if (platform?.includes('ios')) {
      return 'USER_ATTESTATION';
    }
    
    // 기타 플랫폼은 폴백 방식
    return 'FALLBACK';
  }

  /**
   * Android 직접 확인 방법 (PackageManager 시뮬레이션)
   */
  private async verifyAndroidDirect(deviceInfo: DeviceInfo): Promise<WalletVerificationResult> {
    try {
      logger.info('Android 직접 확인 방법 사용');
      
      // 실제 환경에서는 Android Bridge를 통해 설치된 앱 목록 확인
      // 현재는 시뮬레이션
      
      // 디바이스 정보를 기반으로 설치 가능성 판단
      const installationLikelihood = this.calculateInstallationLikelihood(deviceInfo);
      
      if (installationLikelihood > 0.7) {
        return {
          isInstalled: true,
          reason: 'DIRECT_VERIFICATION',
          message: 'Creata Wallet이 설치되어 있습니다.',
          metadata: {
            verificationMethod: 'ANDROID_DIRECT',
            confidence: installationLikelihood
          }
        };
      }
      
      return {
        isInstalled: false,
        reason: 'NOT_INSTALLED',
        message: 'Creata Wallet이 설치되어 있지 않습니다.'
      };
    } catch (error) {
      logger.error('Android 직접 확인 실패:', error);
      throw error;
    }
  }

  /**
   * Google Play Store API를 통한 확인
   */
  private async verifyViaPlayStoreAPI(deviceInfo: DeviceInfo): Promise<WalletVerificationResult> {
    try {
      logger.info('Play Store API를 통한 확인');
      
      // Google Play Store에서 앱 정보 조회
      const playStoreUrl = `${this.GOOGLE_PLAY_BASE_URL}?id=${this.CREATA_WALLET_PACKAGE_ID}`;
      
      const response = await axios.get(playStoreUrl, {
        headers: {
          'User-Agent': deviceInfo.userAgent || 'Mozilla/5.0 (Android)',
        },
        timeout: 10000
      });

      // 응답에서 앱 존재 여부 확인
      const appExists = response.status === 200 && 
                       response.data.includes(this.CREATA_WALLET_PACKAGE_ID);

      if (appExists) {
        // 추가적으로 사용자의 설치 여부는 사용자 증명으로 확인
        return await this.verifyViaUserAttestation('unknown', deviceInfo);
      }

      return {
        isInstalled: false,
        reason: 'APP_NOT_FOUND',
        message: 'Creata Wallet 앱을 찾을 수 없습니다.'
      };
    } catch (error) {
      logger.error('Play Store API 확인 실패:', error);
      // API 실패 시 사용자 증명 방식으로 폴백
      return await this.verifyViaUserAttestation('unknown', deviceInfo);
    }
  }

  /**
   * 사용자 증명 방식 (사용자가 직접 확인)
   */
  private async verifyViaUserAttestation(
    userId: string, 
    deviceInfo: DeviceInfo
  ): Promise<WalletVerificationResult> {
    try {
      logger.info(`사용자 증명 방식 - 사용자: ${userId}`);
      
      // 사용자 증명 토큰 생성
      const attestationToken = this.generateAttestationToken(userId, deviceInfo);
      
      // 실제로는 프론트엔드에서 사용자가 지갑 앱을 열고 증명 토큰을 확인하도록 함
      // 현재는 시뮬레이션
      
      return {
        isInstalled: false, // 사용자가 직접 증명해야 함
        reason: 'USER_ATTESTATION_REQUIRED',
        message: 'Creata Wallet 앱을 열어 설치를 증명해주세요.',
        metadata: {
          attestationToken,
          instructions: [
            '1. Creata Wallet 앱을 실행하세요',
            '2. 설정 > 미션 증명 메뉴로 이동하세요',
            '3. 다음 토큰을 입력하세요: ' + attestationToken,
            '4. 확인 버튼을 눌러주세요'
          ]
        }
      };
    } catch (error) {
      logger.error('사용자 증명 방식 실패:', error);
      throw error;
    }
  }

  /**
   * 폴백 확인 방법
   */
  private async verifyFallback(deviceInfo: DeviceInfo): Promise<WalletVerificationResult> {
    logger.info('폴백 확인 방법 사용');
    
    // 가장 기본적인 확인 방법
    // 사용자 에이전트나 기타 정보를 기반으로 추정
    const likelihood = this.calculateInstallationLikelihood(deviceInfo);
    
    return {
      isInstalled: likelihood > 0.5,
      reason: 'FALLBACK_ESTIMATION',
      message: likelihood > 0.5 
        ? 'Creata Wallet이 설치되어 있을 가능성이 높습니다.'
        : 'Creata Wallet 설치를 확인할 수 없습니다.',
      metadata: {
        confidence: likelihood,
        recommendAction: 'MANUAL_VERIFICATION'
      }
    };
  }

  /**
   * 설치 가능성 계산
   */
  private calculateInstallationLikelihood(deviceInfo: DeviceInfo): number {
    let score = 0.3; // 기본 점수
    
    // Android 플랫폼인 경우 가산점
    if (deviceInfo.platform?.toLowerCase().includes('android')) {
      score += 0.2;
    }
    
    // 최신 버전인 경우 가산점
    if (deviceInfo.androidApiLevel && deviceInfo.androidApiLevel >= 28) {
      score += 0.1;
    }
    
    // 사용자 에이전트에 특정 키워드가 있는 경우
    const userAgent = deviceInfo.userAgent?.toLowerCase() || '';
    if (userAgent.includes('chrome') || userAgent.includes('samsung')) {
      score += 0.1;
    }
    
    // 이전 방문 기록이 있는 경우 (실제로는 DB에서 조회)
    // score += 0.2;
    
    return Math.min(score, 1.0);
  }

  /**
   * 증명 토큰 생성
   */
  private generateAttestationToken(userId: string, deviceInfo: DeviceInfo): string {
    const timestamp = Date.now();
    const data = `${userId}:${deviceInfo.platform}:${timestamp}`;
    
    // 실제로는 JWT나 암호화된 토큰 사용
    return Buffer.from(data).toString('base64').substr(0, 12);
  }

  /**
   * 증명 토큰 검증
   */
  async verifyAttestationToken(
    userId: string, 
    token: string, 
    deviceInfo: DeviceInfo
  ): Promise<boolean> {
    try {
      // 토큰 디코딩 및 검증
      const decoded = Buffer.from(token, 'base64').toString();
      const [tokenUserId, platform, timestamp] = decoded.split(':');
      
      // 유효성 검증
      const isValidUser = tokenUserId === userId;
      const isValidPlatform = platform === deviceInfo.platform;
      const isValidTime = Date.now() - parseInt(timestamp) < 300000; // 5분 이내
      
      return isValidUser && isValidPlatform && isValidTime;
    } catch (error) {
      logger.error('증명 토큰 검증 실패:', error);
      return false;
    }
  }
}

// 타입 정의
export type VerificationMethod = 
  | 'ANDROID_DIRECT' 
  | 'PLAY_STORE_API' 
  | 'USER_ATTESTATION' 
  | 'FALLBACK';

export interface WalletVerificationResult {
  isInstalled: boolean;
  reason: string;
  message: string;
  metadata?: {
    verificationMethod?: string;
    confidence?: number;
    attestationToken?: string;
    instructions?: string[];
    recommendAction?: string;
  };
}