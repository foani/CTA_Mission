// src/controllers/GameController.ts

import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Game, GameStatus } from '../models/Game';
import { GamePrediction, GamePredictionType, GamePredictionStatus } from '../models/GamePrediction';
import { GameScore } from '../models/GameScore';
// import { User } from '../models/User'; // 사용하지 않음
import { PriceService } from '../services/PriceService';
import GameService from '../services/GameService';

// 인터페이스 정의
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

interface StartGameRequest extends Request {
  body: {
    symbol: string;
    duration: number;
    gameType?: string;
  };
}

interface PredictRequest extends AuthenticatedRequest {
  body: {
    gameId: string;
    prediction: GamePredictionType;
    confidence?: number;
  };
}

interface GameHistoryQuery extends AuthenticatedRequest {
  query: {
    page?: string;
    limit?: string;
    status?: string;
    symbol?: string;
  };
}

/**
 * 게임 컨트롤러
 * 게임 생성, 예측, 결과 처리 등의 핵심 게임 로직을 담당
 */
export class GameController {
  private gameRepository: Repository<Game>;
  private predictionRepository: Repository<GamePrediction>;
  private scoreRepository: Repository<GameScore>;
      // private _userRepository: Repository<User>; // 사용하지 않음
  private priceService: PriceService;
  private gameService: GameService;

  constructor() {
    this.gameRepository = AppDataSource.getRepository(Game);
    this.predictionRepository = AppDataSource.getRepository(GamePrediction);
    this.scoreRepository = AppDataSource.getRepository(GameScore);
            // this._userRepository = AppDataSource.getRepository(User);
    this.priceService = new PriceService();
    this.gameService = new GameService();
  }

  /**
   * 헬스 체크
   * GET /api/game/health
   */
  async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      // 데이터베이스 연결 확인
      const gameCount = await this.gameRepository.count();
      
      res.json({
        success: true,
        message: '게임 서비스가 정상 작동 중입니다.',
        data: {
          timestamp: new Date().toISOString(),
          totalGames: gameCount,
          status: 'healthy'
        }
      });
    } catch (error) {
      console.error('헬스 체크 오류:', error);
      res.status(500).json({
        success: false,
        message: '게임 서비스 헬스 체크 실패',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  }

  /**
   * 새 게임 시작
   * POST /api/game/start
   */
  async startGame(req: StartGameRequest, res: Response): Promise<void> {
    try {
      const { symbol, duration, gameType = 'PREDICTION' } = req.body;

      if (!symbol || !duration) {
        res.status(400).json({
          success: false,
          message: '심볼과 게임 시간은 필수 입력 사항입니다.'
        });
        return;
      }

      // 현재 가격 조회
      const currentPrice = await this.priceService.getCurrentPriceBySymbol(symbol);
      if (!currentPrice) {
        res.status(400).json({
          success: false,
          message: '지원하지 않는 토큰이거나 가격 정보를 가져올 수 없습니다.'
        });
        return;
      }

      // 게임 생성
      const game = new Game();
      game.symbol = symbol;
      game.gameType = gameType;
      game.duration = duration;
      game.startPrice = currentPrice.price;
      game.startTime = new Date();
      game.endTime = new Date(Date.now() + duration * 60 * 1000);
      game.status = GameStatus.ACTIVE;
      game.createdBy = (req as any).user?.id || 'system';

      const savedGame = await this.gameRepository.save(game);

      res.status(201).json({
        success: true,
        message: '게임이 시작되었습니다.',
        data: {
          gameId: savedGame.id,
          symbol: savedGame.symbol,
          startPrice: savedGame.startPrice,
          startTime: savedGame.startTime,
          endTime: savedGame.endTime,
          duration: savedGame.duration,
          status: savedGame.status
        }
      });
    } catch (error) {
      console.error('게임 시작 오류:', error);
      res.status(500).json({
        success: false,
        message: '게임 시작 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 활성 게임 목록 조회
   * GET /api/game/active
   */
  async getActiveGames(_req: Request, res: Response): Promise<void> {
    try {
      const activeGames = await this.gameRepository.find({
        where: { status: GameStatus.ACTIVE },
        order: { startTime: 'DESC' },
        take: 10
      });

      // 각 게임의 현재 가격 정보 추가
      const gamesWithCurrentPrice = await Promise.all(
        activeGames.map(async (game) => {
          const currentPrice = await this.priceService.getCurrentPriceBySymbol(game.symbol);
          return {
            ...game,
            currentPrice: currentPrice?.price || game.startPrice,
            priceChange: currentPrice?.priceChange24h || 0,
            remainingTime: Math.max(0, game.endTime.getTime() - Date.now())
          };
        })
      );

      res.json({
        success: true,
        data: gamesWithCurrentPrice
      });
    } catch (error) {
      console.error('활성 게임 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '활성 게임 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 현재 진행 중인 게임 조회
   * GET /api/game/current
   */
  async getCurrentGame(_req: Request, res: Response): Promise<void> {
    try {
      const currentGame = await this.gameRepository.findOne({
        where: { status: GameStatus.ACTIVE },
        order: { startTime: 'DESC' },
        relations: ['predictions']
      });

      if (!currentGame) {
        res.json({
          success: true,
          data: null,
          message: '현재 진행 중인 게임이 없습니다.'
        });
        return;
      }

      // 현재 가격 정보 추가
      const currentPrice = await this.priceService.getCurrentPriceBySymbol(currentGame.symbol);
      
      res.json({
        success: true,
        data: {
          ...currentGame,
          currentPrice: currentPrice?.price || currentGame.startPrice,
          priceChange: currentPrice?.priceChange24h || 0,
          remainingTime: Math.max(0, currentGame.endTime.getTime() - Date.now()),
          participantCount: currentGame.predictions?.length || 0
        }
      });
    } catch (error) {
      console.error('현재 게임 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '현재 게임 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 게임 예측 제출
   * POST /api/game/predict
   */
  async submitPrediction(req: PredictRequest, res: Response): Promise<void> {
    try {
      const { gameId, prediction, confidence = 5 } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
        return;
      }

      if (!prediction || !Object.values(GamePredictionType).includes(prediction)) {
        res.status(400).json({
          success: false,
          message: '올바른 예측 값을 입력해주세요. (UP 또는 DOWN)'
        });
        return;
      }

      // 게임 존재 및 상태 확인
      const game = await this.gameRepository.findOne({
        where: { id: gameId }
      });

      if (!game) {
        res.status(404).json({
          success: false,
          message: '게임을 찾을 수 없습니다.'
        });
        return;
      }

      if (game.status !== GameStatus.ACTIVE) {
        res.status(400).json({
          success: false,
          message: '현재 예측할 수 없는 게임입니다.'
        });
        return;
      }

      // 이미 예측했는지 확인
      const existingPrediction = await this.predictionRepository.findOne({
        where: { gameId, userId }
      });

      if (existingPrediction) {
        res.status(400).json({
          success: false,
          message: '이미 이 게임에 예측을 제출했습니다.'
        });
        return;
      }

      // 현재 가격 조회
      const currentPrice = await this.priceService.getCurrentPriceBySymbol(game.symbol);

      // 예측 생성
      const gamePrediction = new GamePrediction();
      gamePrediction.gameId = gameId;
      gamePrediction.userId = userId;
      gamePrediction.predictionType = prediction;
      gamePrediction.predictionPrice = currentPrice?.price || game.startPrice;
      gamePrediction.updateMetadata({
        predictionTimestamp: Date.now(),
        predictionPrice: currentPrice?.price || game.startPrice,
        gameDuration: game.duration,
        confidence
      });

      const savedPrediction = await this.predictionRepository.save(gamePrediction);

      res.status(201).json({
        success: true,
        message: '예측이 성공적으로 제출되었습니다.',
        data: {
          predictionId: savedPrediction.id,
          gameId: gameId,
          prediction: prediction,
          predictionPrice: savedPrediction.predictionPrice,
          confidence
        }
      });
    } catch (error) {
      console.error('예측 제출 오류:', error);
      res.status(500).json({
        success: false,
        message: '예측 제출 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 사용자 게임 히스토리 조회
   * GET /api/game/history
   */
  async getUserGameHistory(req: GameHistoryQuery, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const {
        page = '1',
        limit = '10',
        status,
        symbol
      } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
        return;
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      const whereConditions: any = {};
      if (status) whereConditions.status = status;
      if (symbol) whereConditions.symbol = symbol;

      const [games, total] = await this.gameRepository.findAndCount({
        where: whereConditions,
        order: { createdAt: 'DESC' },
        skip: offset,
        take: limitNum,
        relations: ['predictions', 'scores']
      });

      const userGames = games.map(game => ({
        ...game,
        userPrediction: game.predictions?.find(p => p.userId === userId),
        userScore: game.scores?.find(s => s.userId === userId)
      }));

      res.json({
        success: true,
        data: {
          games: userGames,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error) {
      console.error('게임 히스토리 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '게임 히스토리 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 게임 히스토리 조회 (라우트 호환성을 위한 메서드)
   * GET /api/game/history
   */
  async getGameHistory(req: GameHistoryQuery, res: Response): Promise<void> {
    return this.getUserGameHistory(req, res);
  }

  /**
   * 게임 상세 정보 조회
   * GET /api/game/:gameId
   */
  async getGameDetail(req: Request, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;

      const game = await this.gameRepository.findOne({
        where: { id: gameId },
        relations: ['predictions', 'scores']
      });

      if (!game) {
        res.status(404).json({
          success: false,
          message: '게임을 찾을 수 없습니다.'
        });
        return;
      }

      let currentPrice = null;
      if (game.status === GameStatus.ACTIVE) {
        currentPrice = await this.priceService.getCurrentPriceBySymbol(game.symbol);
      }

      res.json({
        success: true,
        data: {
          ...game,
          currentPrice: currentPrice?.price || game.endPrice || 0,
          priceChange: currentPrice?.priceChange24h || 0,
          remainingTime: game.status === GameStatus.ACTIVE ? 
            Math.max(0, game.endTime.getTime() - Date.now()) : 0,
          participantCount: game.predictions?.length || 0
        }
      });
    } catch (error) {
      console.error('게임 상세 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '게임 상세 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 게임 취소
   * DELETE /api/game/:gameId/cancel
   */
  async cancelGame(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
        return;
      }

      const game = await this.gameRepository.findOne({
        where: { id: gameId }
      });

      if (!game) {
        res.status(404).json({
          success: false,
          message: '게임을 찾을 수 없습니다.'
        });
        return;
      }

      if (game.createdBy !== userId && req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: '게임을 취소할 권한이 없습니다.'
        });
        return;
      }

      if (game.status === GameStatus.COMPLETED || game.status === GameStatus.CANCELLED) {
        res.status(400).json({
          success: false,
          message: '이미 종료된 게임은 취소할 수 없습니다.'
        });
        return;
      }

      game.status = GameStatus.CANCELLED;
      game.endTime = new Date();
      await this.gameRepository.save(game);

      res.json({
        success: true,
        message: '게임이 취소되었습니다.',
        data: game
      });
    } catch (error) {
      console.error('게임 취소 오류:', error);
      res.status(500).json({
        success: false,
        message: '게임 취소 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 사용자 통계 조회
   * GET /api/game/my/stats
   */
  async getUserStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: '인증이 필요합니다.' });
        return;
      }

      const totalGames = await this.predictionRepository.count({ where: { userId } });
      const totalScore = await this.scoreRepository
        .createQueryBuilder('score')
        .select('SUM(score.points)', 'total')
        .where('score.userId = :userId', { userId })
        .getRawOne();

      const winCount = await this.predictionRepository.count({
        where: { userId, status: GamePredictionStatus.WIN }
      });

      const stats = {
        totalGames,
        winCount,
        lossCount: totalGames - winCount,
        winRate: totalGames > 0 ? (winCount / totalGames * 100).toFixed(2) : '0.00',
        totalScore: totalScore?.total || 0,
        averageScore: totalGames > 0 ? ((totalScore?.total || 0) / totalGames).toFixed(2) : '0.00'
      };

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('사용자 통계 조회 오류:', error);
      res.status(500).json({ success: false, message: '사용자 통계 조회 중 오류가 발생했습니다.' });
    }
  }

  /**
   * 전체 통계 조회
   * GET /api/game/stats/global
   */
  async getGlobalStats(_req: Request, res: Response): Promise<void> {
    try {
      const totalGames = await this.gameRepository.count();
      const activeGames = await this.gameRepository.count({ where: { status: GameStatus.ACTIVE } });
      const completedGames = await this.gameRepository.count({ where: { status: GameStatus.COMPLETED } });
      const totalPlayers = await this.predictionRepository
        .createQueryBuilder('prediction')
        .select('COUNT(DISTINCT prediction.userId)', 'count')
        .getRawOne();

      const stats = {
        totalGames,
        activeGames,
        completedGames,
        totalPlayers: totalPlayers?.count || 0,
        averageGameDuration: 300,
        popularTokens: await this.getPopularTokens()
      };

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('전체 통계 조회 오류:', error);
      res.status(500).json({ success: false, message: '전체 통계 조회 중 오류가 발생했습니다.' });
    }
  }

  /**
   * 리더보드 조회
   * GET /api/game/leaderboard
   */
  async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { page = '1', limit = '10', period: _period = 'all' } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const leaderboard = await this.scoreRepository
        .createQueryBuilder('score')
        .select('score.userId', 'userId')
        .addSelect('SUM(score.points)', 'totalScore')
        .groupBy('score.userId')
        .orderBy('totalScore', 'DESC')
        .limit(limitNum)
        .offset((pageNum - 1) * limitNum)
        .getRawMany();

      // 숫자 변환
      const formatted = leaderboard.map(item => ({
        userId: item.userId,
        totalScore: parseInt(item.totalScore)
      }));

      res.json({ success: true, data: formatted });
    } catch (error) {
      console.error('리더보드 조회 오류:', error);
      res.status(500).json({ success: false, message: '리더보드 조회 중 오류가 발생했습니다.' });
    }
  }

  /**
   * 게임 결과 처리
   * POST /api/game/:gameId/process
   */
  async processGameResult(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;
      const result = await this.gameService.processGameResult(gameId);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('게임 결과 처리 오류:', error);
      res.status(500).json({ success: false, message: '게임 결과 처리 중 오류가 발생했습니다.' });
    }
  }

  /**
   * 지원하는 토큰 목록 조회
   * GET /api/game/tokens
   */
  async getSupportedTokens(_req: Request, res: Response): Promise<void> {
    try {
      const tokens = await this.priceService.getSupportedTokens();
      res.json({ success: true, data: tokens });
    } catch (error) {
      console.error('지원 토큰 조회 오류:', error);
      res.status(500).json({ success: false, message: '지원 토큰 조회 중 오류가 발생했습니다.' });
    }
  }

  /**
   * 게임 결과 시뮬레이션 (개발용)
   * POST /api/game/:gameId/simulate
   */
  async simulateGameResult(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { gameId, endPrice } = req.body;
      const result = await this.gameService.simulateGameResult(gameId, endPrice);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('게임 시뮬레이션 오류:', error);
      res.status(500).json({ success: false, message: '게임 시뮬레이션 중 오류가 발생했습니다.' });
    }
  }

  /**
   * 사용자 통계 초기화 (개발용)
   * POST /api/game/dev/reset-stats
   */
  async resetUserStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId: targetUserId } = req.body;
      // 예측, 점수 모두 삭제 (통계 초기화 목적)
      await this.predictionRepository.delete({ userId: targetUserId });
      await this.scoreRepository.delete({ userId: targetUserId });
      res.json({ success: true, message: '사용자 통계가 초기화되었습니다.' });
    } catch (error) {
      console.error('통계 초기화 오류:', error);
      res.status(500).json({ success: false, message: '통계 초기화 중 오류가 발생했습니다.' });
    }
  }

  /**
   * 게임 디버그 정보 조회 (개발용)
   * GET /api/game/:gameId/debug
   */
  async getGameDebugInfo(req: Request, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;
      const debugInfo = await this.gameService.getGameDebugInfo(gameId);
      res.json({ success: true, data: debugInfo });
    } catch (error) {
      console.error('디버그 정보 조회 오류:', error);
      res.status(500).json({ success: false, message: '디버그 정보 조회 중 오류가 발생했습니다.' });
    }
  }

  /**
   * 인기 토큰 목록 조회 (private 메서드)
   */
  private async getPopularTokens() {
    try {
      const result = await this.gameRepository
        .createQueryBuilder('game')
        .select('game.symbol', 'symbol') // 별칭 명시
        .addSelect('COUNT(game.id)', 'count')
        .groupBy('game.symbol')
        .orderBy('count', 'DESC')
        .limit(5)
        .getRawMany();

      return result.map(item => ({
        symbol: item.symbol, // ← 이게 맞음
        gameCount: parseInt(item.count)
      }));
    } catch (error) {
      console.error('인기 토큰 조회 오류:', error);
      return [];
    }
  }
}

export default GameController;