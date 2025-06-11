import { Request, Response, NextFunction } from 'express';
import { MissionService } from '../services/MissionService';
import { logger } from '../utils/logger';

export class MissionController {
  private missionService?: MissionService;

  constructor() {
    // 생성자에서는 서비스를 초기화하지 않음 (lazy initialization)
  }

  /**
   * MissionService 인스턴스 반환 (싱글톤 패턴 사용)
   */
  private getMissionService(): MissionService {
    if (!this.missionService) {
      this.missionService = MissionService.getInstance();
    }
    return this.missionService;
  }

  getAllMissions = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const missions = await this.getMissionService().getAllMissions();
      res.status(200).json({
        success: true,
        message: '미션 목록 조회 성공',
        data: missions
      });
    } catch (error) {
      logger.error('GET /api/v1/missions error:', error);
      next(error);
    }
  };

  getUserMissionStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' });
        return;
      }
      const missionStatus = await this.getMissionService().getUserMissionStatus(userId);
      res.status(200).json({
        success: true,
        message: '사용자 미션 현황 조회 성공',
        data: missionStatus
      });
    } catch (error) {
      logger.error('getUserMissionStatus error:', error);
      next(error);
    }
  };

  checkWalletInstallation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, deviceInfo } = req.body;
      if (!userId) {
        res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' });
        return;
      }
      const result = await this.getMissionService().checkWalletInstallation(userId, deviceInfo);
      res.status(200).json({
        success: true,
        message: '지갑 설치 확인 완료',
        data: { walletInstalled: result.success, earnedPoints: result.points || 0 }
      });
    } catch (error) {
      logger.error('checkWalletInstallation error:', error);
      next(error);
    }
  };

  checkHomepageVisit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, visitToken, deviceInfo } = req.body;
      if (!userId) {
        res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' });
        return;
      }
      const result = await this.getMissionService().checkHomepageVisit(userId, visitToken, deviceInfo);
      res.status(200).json({
        success: true,
        message: '홈페이지 방문 확인 완료',
        data: { homepageVisited: result.success, earnedPoints: result.points || 0 }
      });
    } catch (error) {
      logger.error('checkHomepageVisit error:', error);
      next(error);
    }
  };

  completeMission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { missionId } = req.params;
      const { userId, points } = req.body;
      if (!missionId || !userId) {
        res.status(400).json({ success: false, message: 'ID가 필요합니다.' });
        return;
      }
      const result = await this.getMissionService().completeMission(userId, missionId, points || 10);
      res.status(200).json({
        success: true,
        message: '미션 완료',
        data: result
      });
    } catch (error) {
      logger.error('completeMission error:', error);
      next(error);
    }
  };

  startHomepageVisit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, deviceInfo } = req.body;
      if (!userId) {
        res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' });
        return;
      }
      const result = await this.getMissionService().startHomepageVisit(userId, deviceInfo || {});
      res.status(200).json({
        success: true,
        message: '홈페이지 방문 세션 시작',
        data: result
      });
    } catch (error) {
      logger.error('startHomepageVisit error:', error);
      next(error);
    }
  };

  getHomepageVisitStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { visitToken } = req.params;
      if (!visitToken) {
        res.status(400).json({ success: false, message: '방문 토큰이 필요합니다.' });
        return;
      }
      const result = await this.getMissionService().getHomepageVisitStatus(visitToken);
      res.status(200).json({
        success: true,
        message: '홈페이지 방문 상태 조회',
        data: result
      });
    } catch (error) {
      logger.error('getHomepageVisitStatus error:', error);
      next(error);
    }
  };

  verifyWalletAttestation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, attestationToken, deviceInfo } = req.body;
      if (!userId || !attestationToken) {
        res.status(400).json({ success: false, message: '사용자 ID와 증명 토큰이 필요합니다.' });
        return;
      }
      const result = await this.getMissionService().verifyWalletAttestation(userId, attestationToken, deviceInfo || {});
      res.status(200).json({
        success: true,
        message: '지갑 설치 증명 검증',
        data: result
      });
    } catch (error) {
      logger.error('verifyWalletAttestation error:', error);
      next(error);
    }
  };

  getUserStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' });
        return;
      }
      const statistics = await this.getMissionService().getUserStatistics(userId);
      res.status(200).json({
        success: true,
        message: '사용자 통계 조회',
        data: statistics
      });
    } catch (error) {
      logger.error('getUserStatistics error:', error);
      next(error);
    }
  };

  getUserRanking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      // TODO: 실제 랭킹 로직 구현
      const ranking: any[] = [];
      console.log(`Limit: ${limit}`); // 사용된 것으로 표시
      res.status(200).json({ success: true, message: '랭킹 조회', data: ranking });
    } catch (error) {
      logger.error('getUserRanking error:', error);
      next(error);
    }
  };
  
  getMissionStatistics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // TODO: 실제 통계 로직 구현
      const statistics = { totalMissions: 0, completedMissions: 0 };
      res.status(200).json({ success: true, message: '통계 조회', data: statistics });
    } catch (error) {
      logger.error('getMissionStatistics error:', error);
      next(error);
    }
  };
  
  updateUserRankings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // TODO: 실제 랭킹 업데이트 로직 구현
      res.status(200).json({ success: true, message: '랭킹 업데이트' });
    } catch (error) {
      logger.error('updateUserRankings error:', error);
      next(error);
    }
  };

  healthCheck = async (_req: Request, res: Response): Promise<void> => {
    try {
      const missions = await this.getMissionService().getAllMissions();
      res.status(200).json({
        success: true,
        message: '정상 작동',
        data: { timestamp: new Date().toISOString(), missionCount: missions.length, status: 'healthy' }
      });
    } catch (error) {
      logger.error('healthCheck error:', error);
      res.status(503).json({ success: false, message: '시스템 문제' });
    }
  };
}