// src/controllers/RankingController.ts

import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Ranking } from '../models/Ranking';
// import { User } from '../models/User'; // 사용하지 않음
import { RankingService } from '../services/RankingService';

// 인증된 요청 타입 정의
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    walletAddress: string;
    role: string;
  };
}

// 요청 타입 정의
interface RankingQuery extends Request {
  query: {
    period?: string;
    limit?: string;
    offset?: string;
    metric?: string;
    page?: string;
  };
}

interface SeasonRequest extends AuthenticatedRequest {
  body: {
    name: string;
    startDate: string;
    endDate: string;
    description?: string;
  };
}

/**
 * 랭킹 관련 API 컨트롤러
 * 랭킹 조회, 에어드롭 관리, 시즌 관리
 */
export class RankingController {
  private rankingRepository: Repository<Ranking>;
      // private _userRepository: Repository<User>; // 사용하지 않음
  private rankingService: RankingService;

  constructor() {
    this.rankingRepository = AppDataSource.getRepository(Ranking);
            // this._userRepository = AppDataSource.getRepository(User);
    this.rankingService = new RankingService();
  }

  /**
   * 랭킹 시스템 헬스체크
   * GET /api/ranking/health
   */
  async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      const rankingCount = await this.rankingRepository.count();
      const activeSeasonCount = await this.rankingService.getActiveSeasonCount();
      
      res.json({
        success: true,
        status: 'healthy',
        data: {
          timestamp: new Date().toISOString(),
          database: 'connected',
          rankingCount,
          activeSeasons: activeSeasonCount
        }
      });
    } catch (error) {
      console.error('Ranking health check 오류:', error);
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        message: '랭킹 서비스 상태 확인 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 랭킹 조회 (통합 메서드)
   * GET /api/ranking/weekly, /api/ranking/monthly, /api/ranking/daily, /api/ranking/all-time
   */
  async getRanking(req: RankingQuery, res: Response): Promise<void> {
    try {
      const {
        period = 'weekly',
        limit = '100',
        offset = '0',
        metric = 'totalScore'
      } = req.query;

      const rankings = await this.rankingService.getRanking(
        period,
        parseInt(limit),
        parseInt(offset),
        metric
      );

      res.json({
        success: true,
        data: rankings,
        meta: {
          period,
          limit: parseInt(limit),
          offset: parseInt(offset),
          metric
        }
      });
    } catch (error) {
      console.error('랭킹 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '랭킹 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 현재 랭킹 조회 (기존 메서드와 호환성 유지)
   * GET /api/ranking/current
   */
  async getCurrentRanking(req: RankingQuery, res: Response): Promise<void> {
    return this.getRanking(req, res);
  }

  /**
   * 내 랭킹 조회
   * GET /api/ranking/my
   */
  async getMyRanking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
        return;
      }

      const myRanking = await this.rankingService.getUserRanking(userId);

      if (!myRanking) {
        res.status(404).json({
          success: false,
          message: '랭킹 정보를 찾을 수 없습니다.'
        });
        return;
      }

      res.json({
        success: true,
        data: myRanking
      });
    } catch (error) {
      console.error('내 랭킹 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '내 랭킹 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 상위 리더보드 조회
   * GET /api/ranking/leaderboard/top
   */
  async getTopLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { limit = '10', period = 'weekly' } = req.query;

      const topRankings = await this.rankingService.getTopLeaderboard(
        parseInt(limit as string),
        period as string
      );

      res.json({
        success: true,
        data: topRankings
      });
    } catch (error) {
      console.error('상위 리더보드 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '상위 리더보드 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 랭킹 업데이트
   * POST /api/ranking/admin/update
   */
  async updateRanking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다.'
        });
        return;
      }

      const { userId, score, period = 'current' } = req.body;

      if (!userId || score === undefined) {
        res.status(400).json({
          success: false,
          message: '사용자 ID와 점수가 필요합니다.'
        });
        return;
      }

      const updatedRanking = await this.rankingService.updateUserRanking(
        userId,
        score,
        period
      );

      res.json({
        success: true,
        data: updatedRanking,
        message: '랭킹이 업데이트되었습니다.'
      });
    } catch (error) {
      console.error('랭킹 업데이트 오류:', error);
      res.status(500).json({
        success: false,
        message: '랭킹 업데이트 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 랭킹 일괄 업데이트
   * POST /api/ranking/admin/update-all
   */
  async updateRankings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다.'
        });
        return;
      }

      const result = await this.rankingService.updateAllRankings();

      res.json({
        success: true,
        data: result,
        message: '모든 랭킹이 업데이트되었습니다.'
      });
    } catch (error) {
      console.error('랭킹 일괄 업데이트 오류:', error);
      res.status(500).json({
        success: false,
        message: '랭킹 일괄 업데이트 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 에어드롭 일정 조회
   * GET /api/ranking/airdrop/schedule
   */
  async getAirdropSchedule(_req: Request, res: Response): Promise<void> {
    try {
      const schedule = await this.rankingService.getAirdropSchedule();

      res.json({
        success: true,
        data: schedule
      });
    } catch (error) {
      console.error('에어드롭 일정 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '에어드롭 일정 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 내 에어드롭 히스토리 조회
   * GET /api/ranking/airdrop/my/history
   */
  async getMyAirdropHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
        return;
      }

      const history = await this.rankingService.getUserAirdropHistory(userId);

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('내 에어드롭 히스토리 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '내 에어드롭 히스토리 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 에어드롭 히스토리 조회 (호환성을 위한 메서드)
   * GET /api/ranking/airdrop/history
   */
  async getAirdropHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    return this.getMyAirdropHistory(req, res);
  }

  /**
   * 에어드롭 대상자 조회
   * GET /api/ranking/airdrop/eligible
   */
  async getAirdropEligible(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'current', rank = 'all' } = req.query;

      const eligibleUsers = await this.rankingService.getAirdropEligibleUsers(
        period as string,
        rank as string
      );

      res.json({
        success: true,
        data: eligibleUsers
      });
    } catch (error) {
      console.error('에어드롭 대상자 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '에어드롭 대상자 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 에어드롭 실행
   * POST /api/ranking/admin/airdrop/execute
   */
  async executeAirdrop(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다.'
        });
        return;
      }

      const { period = 'current', dryRun = false } = req.body;

      const result = await this.rankingService.executeAirdrop(period, dryRun);

      res.json({
        success: true,
        data: result,
        message: dryRun ? '에어드롭 시뮬레이션이 완료되었습니다.' : '에어드롭이 실행되었습니다.'
      });
    } catch (error) {
      console.error('에어드롭 실행 오류:', error);
      res.status(500).json({
        success: false,
        message: '에어드롭 실행 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 에어드롭 대상자 조회 (별칭)
   * GET /api/ranking/airdrop/targets
   */
  async getAirdropTargets(req: Request, res: Response): Promise<void> {
    return this.getAirdropEligible(req, res);
  }

  /**
   * 에어드롭 통계 조회
   * GET /api/ranking/airdrop/stats
   */
  async getAirdropStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.rankingService.getAirdropStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('에어드롭 통계 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '에어드롭 통계 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 에어드롭 재시도
   * POST /api/ranking/admin/airdrop/retry
   */
  async retryAirdrop(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다.'
        });
        return;
      }

      const { airdropId } = req.body;

      if (!airdropId) {
        res.status(400).json({
          success: false,
          message: '에어드롭 ID가 필요합니다.'
        });
        return;
      }

      const result = await this.rankingService.retryAirdrop(airdropId);

      res.json({
        success: true,
        data: result,
        message: '에어드롭 재시도가 완료되었습니다.'
      });
    } catch (error) {
      console.error('에어드롭 재시도 오류:', error);
      res.status(500).json({
        success: false,
        message: '에어드롭 재시도 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 현재 시즌 조회
   * GET /api/ranking/season/current
   */
  async getCurrentSeason(_req: Request, res: Response): Promise<void> {
    try {
      const currentSeason = await this.rankingService.getCurrentSeason();

      if (!currentSeason) {
        res.status(404).json({
          success: false,
          message: '활성 시즌이 없습니다.'
        });
        return;
      }

      res.json({
        success: true,
        data: currentSeason
      });
    } catch (error) {
      console.error('현재 시즌 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '현재 시즌 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 시즌 히스토리 조회
   * GET /api/ranking/season/history
   */
  async getSeasonHistory(req: Request, res: Response): Promise<void> {
    try {
      const { page = '1', limit = '10' } = req.query;

      const history = await this.rankingService.getSeasonHistory(
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('시즌 히스토리 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '시즌 히스토리 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 새 시즌 생성
   * POST /api/ranking/admin/season/create
   */
  async createSeason(req: SeasonRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다.'
        });
        return;
      }

      const { name, startDate, endDate, description } = req.body;

      if (!name || !startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: '시즌 이름, 시작일, 종료일이 필요합니다.'
        });
        return;
      }

      const newSeason = await this.rankingService.createSeason({
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description
      });

      res.status(201).json({
        success: true,
        data: newSeason,
        message: '새 시즌이 생성되었습니다.'
      });
    } catch (error) {
      console.error('시즌 생성 오류:', error);
      res.status(500).json({
        success: false,
        message: '시즌 생성 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 랭킹 초기화
   * DELETE /api/ranking/dev/reset
   */
  async resetRanking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다.'
        });
        return;
      }

      const { period = 'current' } = req.body;

      await this.rankingService.resetRanking(period);

      res.json({
        success: true,
        message: `${period} 랭킹이 초기화되었습니다.`
      });
    } catch (error) {
      console.error('랭킹 초기화 오류:', error);
      res.status(500).json({
        success: false,
        message: '랭킹 초기화 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 랭킹 일괄 초기화
   * DELETE /api/ranking/dev/reset-all
   */
  async resetRankings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다.'
        });
        return;
      }

      await this.rankingService.resetAllRankings();

      res.json({
        success: true,
        message: '모든 랭킹이 초기화되었습니다.'
      });
    } catch (error) {
      console.error('랭킹 일괄 초기화 오류:', error);
      res.status(500).json({
        success: false,
        message: '랭킹 일괄 초기화 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 테스트 데이터 생성
   * POST /api/ranking/dev/seed
   */
  async seedRankings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다.'
        });
        return;
      }

      const { userCount = 100 } = req.body;

      const result = await this.rankingService.seedRankings(userCount);

      res.json({
        success: true,
        data: result,
        message: `${userCount}명의 테스트 랭킹 데이터가 생성되었습니다.`
      });
    } catch (error) {
      console.error('랭킹 테스트 데이터 생성 오류:', error);
      res.status(500).json({
        success: false,
        message: '랭킹 테스트 데이터 생성 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 에어드롭 시뮬레이션
   * POST /api/ranking/dev/simulate-airdrop
   */
  async simulateAirdrop(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다.'
        });
        return;
      }

      const { period = 'current' } = req.body;

      const result = await this.rankingService.simulateAirdrop(period);

      res.json({
        success: true,
        data: result,
        message: '에어드롭 시뮬레이션이 완료되었습니다.'
      });
    } catch (error) {
      console.error('에어드롭 시뮬레이션 오류:', error);
      res.status(500).json({
        success: false,
        message: '에어드롭 시뮬레이션 중 오류가 발생했습니다.'
      });
    }
  }
}

export default RankingController;