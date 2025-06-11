/**
 * MissionService - 실제 미션 시스템 비즈니스 로직
 * 지갑 설치 확인 및 홈페이지 방문 확인 통합 구현
 * 싱글톤 패턴 + 명시적 초기화로 데이터베이스 연결 문제 완전 해결
 */

import { Repository } from 'typeorm';
import { getDataSource } from '../config/database';
import { Mission } from '../models/Mission';
import { UserMission } from '../models/UserMission';
import { User } from '../models/User';
import { PointHistory } from '../models/PointHistory';
import { DeviceInfo } from '../types/common.types';
import { logger } from '../utils/logger';
import { WalletVerificationService, WalletVerificationResult } from './WalletVerificationService';
import { HomepageVisitService, VisitSessionResult, VisitVerificationResult } from './HomepageVisitService';

export class MissionService {
  private static instance: MissionService;
  
  private missionRepository?: Repository<Mission>;
  private userRepository?: Repository<User>;
  private userMissionRepository?: Repository<UserMission>;
  private pointHistoryRepository?: Repository<PointHistory>;
  
  // 전용 서비스들
  private walletVerificationService: WalletVerificationService;
  private homepageVisitService: HomepageVisitService;
  private isInitialized = false;

  private constructor() {
    // 서비스 초기화만 (데이터베이스 접근 절대 금지)
    this.walletVerificationService = new WalletVerificationService();
    this.homepageVisitService = new HomepageVisitService();
    
    // 주기적으로 만료된 세션 정리 (10분마다)
    setInterval(() => {
      this.homepageVisitService.cleanupExpiredSessions();
    }, 600000);
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): MissionService {
    if (!MissionService.instance) {
      MissionService.instance = new MissionService();
    }
    return MissionService.instance;
  }

  /**
   * 리포지토리 명시적 초기화 (서버 시작 시 호출)
   */
  public async initializeRepositories(): Promise<void> {
    if (this.isInitialized) {
      logger.info('MissionService repositories already initialized');
      return;
    }

    try {
      logger.info('MissionService repositories 초기화 시작...');
      
      const dataSource = getDataSource();
      
      this.missionRepository = dataSource.getRepository(Mission);
      this.userRepository = dataSource.getRepository(User);
      this.userMissionRepository = dataSource.getRepository(UserMission);
      this.pointHistoryRepository = dataSource.getRepository(PointHistory);
      
      this.isInitialized = true;
      
      logger.info('✅ MissionService repositories 초기화 완료');
    } catch (error) {
      this.isInitialized = false;
      logger.error('❌ MissionService repositories 초기화 실패:', error);
      throw new Error('데이터베이스 연결이 필요합니다. 서버 초기화를 확인해주세요.');
    }
  }

  /**
   * 안전한 리포지토리 접근
   */
  private getRepositories() {
    if (!this.isInitialized) {
      throw new Error('MissionService가 초기화되지 않았습니다. initializeRepositories()를 먼저 호출하세요.');
    }
    
    return {
      missionRepository: this.missionRepository!,
      userRepository: this.userRepository!,
      userMissionRepository: this.userMissionRepository!,
      pointHistoryRepository: this.pointHistoryRepository!
    };
  }

  /**
   * 초기화 상태 확인
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 모든 미션 목록 조회
   */
  async getAllMissions(): Promise<Mission[]> {
    try {
      const { missionRepository } = this.getRepositories();
      
      return await missionRepository.find({
        order: { order: 'ASC' }
      });
    } catch (error) {
      logger.error('Failed to get all missions:', error);
      throw error;
    }
  }

  /**
   * 특정 사용자의 미션 상태 조회
   */
  async getUserMissionStatus(userId: string): Promise<any[]> {
    try {
      const { userRepository, userMissionRepository } = this.getRepositories();
      
      // 사용자 존재 확인
      const user = await userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      const userMissions = await userMissionRepository.find({
        where: { userId },
        relations: ['mission'],
        order: { mission: { order: 'ASC' } }
      });

      return userMissions.map(um => ({
        missionId: um.missionId,
        status: um.status,
        progress: um.progress,
        points: um.pointsEarned,
        completedAt: um.completedAt,
        mission: {
          title: um.mission.title,
          description: um.mission.description,
          type: um.mission.type,
          points: um.mission.points
        }
      }));
    } catch (error) {
      logger.error(`Failed to get user mission status for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * 지갑 설치 확인 미션 처리
   */
  async checkWalletInstallation(
    userId: string,
    deviceInfo: DeviceInfo
  ): Promise<{ success: boolean; points?: number; message?: string; data?: any }> {
    try {
      logger.info(`지갑 설치 확인 시작 - 사용자: ${userId}`);
      
      const { userRepository, userMissionRepository } = this.getRepositories();
      
      // 사용자 존재 확인
      const user = await userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // 이미 완료된 미션인지 확인
      const existingMission = await userMissionRepository.findOne({
        where: { userId, missionId: 'wallet-install', status: 'completed' }
      });

      if (existingMission) {
        return {
          success: true,
          points: existingMission.pointsEarned,
          message: '이미 완료된 미션입니다.',
          data: { alreadyCompleted: true }
        };
      }

      // 지갑 설치 확인
      const verificationResult: WalletVerificationResult = 
        await this.walletVerificationService.verifyWalletInstallation(userId, deviceInfo);

      if (verificationResult.isInstalled) {
        // 미션 완료 처리
        const points = 100;
        await this.completeMission(userId, 'wallet-install', points, {
          verificationMethod: verificationResult.metadata?.verificationMethod,
          confidence: verificationResult.metadata?.confidence
        });

        return {
          success: true,
          points,
          message: verificationResult.message,
          data: {
            verificationMethod: verificationResult.metadata?.verificationMethod,
            confidence: verificationResult.metadata?.confidence
          }
        };
      } else {
        // 설치되지 않음 또는 추가 확인 필요
        return {
          success: false,
          message: verificationResult.message,
          data: {
            reason: verificationResult.reason,
            instructions: verificationResult.metadata?.instructions,
            attestationToken: verificationResult.metadata?.attestationToken
          }
        };
      }
    } catch (error) {
      logger.error(`지갑 설치 확인 실패 - 사용자: ${userId}:`, error);
      throw error;
    }
  }

  /**
   * 지갑 설치 증명 토큰 검증
   */
  async verifyWalletAttestation(
    userId: string,
    attestationToken: string,
    deviceInfo: DeviceInfo
  ): Promise<{ success: boolean; points?: number; message: string }> {
    try {
      const isValid = await this.walletVerificationService.verifyAttestationToken(
        userId, attestationToken, deviceInfo
      );

      if (isValid) {
        const points = 100;
        await this.completeMission(userId, 'wallet-install', points, {
          verificationMethod: 'USER_ATTESTATION',
          attestationToken
        });

        return {
          success: true,
          points,
          message: 'Creata Wallet 설치가 확인되었습니다.'
        };
      } else {
        return {
          success: false,
          message: '유효하지 않은 증명 토큰입니다.'
        };
      }
    } catch (error) {
      logger.error(`지갑 설치 증명 검증 실패 - 사용자: ${userId}:`, error);
      throw error;
    }
  }

  /**
   * 홈페이지 방문 세션 시작
   */
  async startHomepageVisit(
    userId: string,
    deviceInfo: DeviceInfo
  ): Promise<VisitSessionResult> {
    try {
      const { userRepository, userMissionRepository } = this.getRepositories();
      
      // 사용자 존재 확인
      const user = await userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // 이미 완료된 미션인지 확인
      const existingMission = await userMissionRepository.findOne({
        where: { userId, missionId: 'homepage-visit', status: 'completed' }
      });

      if (existingMission) {
        return {
          success: true,
          message: '이미 완료된 미션입니다.'
        };
      }

      // 방문 세션 시작
      return await this.homepageVisitService.startVisitSession(userId, deviceInfo);
    } catch (error) {
      logger.error(`홈페이지 방문 세션 시작 실패 - 사용자: ${userId}:`, error);
      return {
        success: false,
        message: '방문 세션 시작 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 홈페이지 방문 확인 미션 처리
   */
  async checkHomepageVisit(
    userId: string,
    visitToken: string,
    _deviceInfo?: DeviceInfo
  ): Promise<{ success: boolean; points?: number; message?: string; data?: any }> {
    try {
      logger.info(`홈페이지 방문 확인 - 사용자: ${userId}, 토큰: ${visitToken}`);

      // 방문 세션 종료 및 검증
      const verificationResult: VisitVerificationResult = 
        await this.homepageVisitService.endVisitSession(visitToken);

      if (verificationResult.isValid) {
        // 미션 완료 처리
        const points = 50;
        await this.completeMission(userId, 'homepage-visit', points, {
          visitDuration: verificationResult.duration,
          pageViews: verificationResult.metadata?.pageViews
        });

        return {
          success: true,
          points,
          message: verificationResult.message,
          data: {
            duration: verificationResult.duration,
            pageViews: verificationResult.metadata?.pageViews
          }
        };
      } else {
        return {
          success: false,
          message: verificationResult.message,
          data: {
            reason: verificationResult.reason,
            duration: verificationResult.duration,
            required: verificationResult.required
          }
        };
      }
    } catch (error) {
      logger.error(`홈페이지 방문 확인 실패 - 사용자: ${userId}:`, error);
      throw error;
    }
  }

  /**
   * 홈페이지 방문 상태 조회
   */
  async getHomepageVisitStatus(visitToken: string): Promise<any> {
    try {
      return await this.homepageVisitService.getVisitStatus(visitToken);
    } catch (error) {
      logger.error(`홈페이지 방문 상태 조회 실패 - 토큰: ${visitToken}:`, error);
      throw error;
    }
  }

  /**
   * 미션 완료 처리 (공용 메서드)
   */
  async completeMission(
    userId: string, 
    missionId: string, 
    points: number,
    metadata?: any
  ): Promise<UserMission> {
    try {
      // 트랜잭션으로 처리
      const dataSource = getDataSource();
      
      return await dataSource.transaction(async (manager) => {
        // UserMission 업데이트 또는 생성
        let userMission = await manager.findOne(UserMission, {
          where: { userId, missionId }
        });

        if (!userMission) {
          userMission = manager.create(UserMission, {
            userId,
            missionId,
            status: 'completed',
            progress: 100,
            pointsEarned: points,
            startedAt: new Date(),
            completedAt: new Date(),
            metadata
          });
        } else {
          userMission.status = 'completed';
          userMission.progress = 100;
          userMission.pointsEarned = points;
          userMission.completedAt = new Date();
          userMission.metadata = metadata;
        }

        await manager.save(UserMission, userMission);

        // 사용자 총 점수 업데이트
        const user = await manager.findOne(User, { where: { id: userId } });
        if (user) {
          user.totalScore = (user.totalScore || 0) + points;
          await manager.save(User, user);
        }

        // 포인트 히스토리 기록
        const pointHistory = manager.create(PointHistory, {
          userId,
          points,
          type: 'MISSION_COMPLETION' as any,
          reason: `미션 완료: ${missionId}`,
          relatedId: missionId,
          metadata,
          createdAt: new Date()
        });

        await manager.save(PointHistory, pointHistory);

        logger.info(`미션 완료 - 사용자: ${userId}, 미션: ${missionId}, 점수: ${points}`);
        
        return userMission;
      });
    } catch (error) {
      logger.error(`미션 완료 처리 실패 - 사용자: ${userId}, 미션: ${missionId}:`, error);
      throw error;
    }
  }

  /**
   * 사용자별 미션 시작
   */
  async startMission(userId: string, missionId: string): Promise<UserMission> {
    try {
      const { userMissionRepository } = this.getRepositories();
      
      // 이미 시작된 미션인지 확인
      const existingUserMission = await userMissionRepository.findOne({
        where: { userId, missionId }
      });

      if (existingUserMission) {
        return existingUserMission;
      }

      // 새 미션 시작
      const userMission = userMissionRepository.create({
        userId,
        missionId,
        status: 'in_progress',
        progress: 0,
        pointsEarned: 0,
        startedAt: new Date()
      });

      return await userMissionRepository.save(userMission);
    } catch (error) {
      logger.error(`미션 시작 실패 - 사용자: ${userId}, 미션: ${missionId}:`, error);
      throw error;
    }
  }

  /**
   * 미션 보상 수령 처리
   */
  async claimReward(userId: string, missionId: string): Promise<boolean> {
    try {
      const { userMissionRepository } = this.getRepositories();
      
      const userMission = await userMissionRepository.findOne({
        where: { userId, missionId, status: 'completed' }
      });

      if (!userMission) {
        return false;
      }

      userMission.status = 'claimed';
      userMission.claimedAt = new Date();
      
      await userMissionRepository.save(userMission);
      
      // TODO: 실제 토큰/에어드롭 지급 로직 추가
      
      return true;
    } catch (error) {
      logger.error(`보상 수령 실패 - 사용자: ${userId}, 미션: ${missionId}:`, error);
      throw error;
    }
  }

  /**
   * 사용자 통계 조회
   */
  async getUserStatistics(userId: string): Promise<any> {
    try {
      const { userRepository, pointHistoryRepository, userMissionRepository } = this.getRepositories();
      
      const user = await userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      const completedMissions = await userMissionRepository.count({
        where: { userId, status: 'completed' }
      });

      const totalPoints = await pointHistoryRepository
        .createQueryBuilder('ph')
        .select('SUM(ph.points)', 'total')
        .where('ph.userId = :userId', { userId })
        .getRawOne();

      return {
        userId,
        totalScore: user.totalScore || 0,
        completedMissions,
        totalPointsEarned: totalPoints?.total || 0,
        missionCompleted: user.missionCompleted || false,
        walletInstalled: user.walletInstalled || false,
        homepageVisited: user.homepageVisited || false
      };
    } catch (error) {
      logger.error(`사용자 통계 조회 실패 - 사용자: ${userId}:`, error);
      throw error;
    }
  }
}