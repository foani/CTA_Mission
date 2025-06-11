// src/services/GameService.ts

import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Game, GameStatus } from '../models/Game';
import { GamePrediction, GamePredictionStatus, GamePredictionType } from '../models/GamePrediction';
import { GameScore, GameScoreType, GameScoreStatus } from '../models/GameScore';
// import { User } from '../models/User'; // 사용하지 않음
import { PriceService } from './PriceService';

/**
 * 게임 관련 비즈니스 로직 서비스
 */
export class GameService {
  private gameRepository: Repository<Game>;
  private predictionRepository: Repository<GamePrediction>;
  private scoreRepository: Repository<GameScore>;
  // private userRepository: Repository<User>; // 사용하지 않음
  private priceService: PriceService;

  constructor() {
    this.gameRepository = AppDataSource.getRepository(Game);
    this.predictionRepository = AppDataSource.getRepository(GamePrediction);
    this.scoreRepository = AppDataSource.getRepository(GameScore);
    // this.userRepository = AppDataSource.getRepository(User); // 사용하지 않음
    this.priceService = new PriceService();
  }

  /**
   * 게임 결과 계산
   */
  async calculateGameResult(gameId: string, userId: string): Promise<{
    game: Game;
    prediction: GamePrediction | null;
    score: number;
    isCorrect: boolean;
    endPrice: number;
  }> {
    // 게임 조회
    const game = await this.gameRepository.findOne({
      where: { id: gameId }
    });

    if (!game) {
      throw new Error('게임을 찾을 수 없습니다.');
    }

    // 사용자 예측 조회
    const prediction = await this.predictionRepository.findOne({
      where: { gameId, userId }
    });

    if (!prediction) {
      throw new Error('예측을 찾을 수 없습니다.');
    }

    // 게임이 아직 종료되지 않았다면 현재 가격으로 종료
    if (game.status === GameStatus.ACTIVE) {
      const currentPrice = await this.priceService.getCurrentPriceBySymbol(game.symbol);
      
      if (!currentPrice) {
        throw new Error('현재 가격을 조회할 수 없습니다.');
      }

      // 게임 종료 처리
      game.status = GameStatus.COMPLETED;
      game.endTime = new Date();
      await this.gameRepository.save(game);

      // 예측 결과 업데이트
      prediction.updateResult(currentPrice.price);
      await this.predictionRepository.save(prediction);

      // 사용자 점수 업데이트
      await this.updateUserScore(userId, prediction.isCorrect, prediction.score);
    }

    return {
      game,
      prediction,
      score: prediction.score,
      isCorrect: prediction.isCorrect,
      endPrice: prediction.endPrice || 0
    };
  }

  /**
   * 사용자 점수 업데이트
   */
  private async updateUserScore(userId: string, isCorrect: boolean, score: number): Promise<void> {
    let userScore = await this.scoreRepository.findOne({
      where: { userId }
    });

    if (!userScore) {
      userScore = this.scoreRepository.create({
        userId,
        scoreType: GameScoreType.PREDICTION_WIN,
        points: score,
        totalPointsAfter: score,
        status: GameScoreStatus.CONFIRMED,
        description: isCorrect ? '예측 성공' : '예측 실패',
        awardedBy: 'system'
      });
      } else {
      // 기존 점수 레코드를 업데이트
      userScore.points = score;
      userScore.totalPointsAfter = userScore.totalPointsAfter + score;
      userScore.description = isCorrect ? '예측 성공' : '예측 실패';
      userScore.status = GameScoreStatus.CONFIRMED;
      }
    
    await this.scoreRepository.save(userScore);
  }

  /**
   * 활성 게임 종료
   */
  async endActiveGames(): Promise<void> {
    const activeGames = await this.gameRepository.find({
      where: { status: GameStatus.ACTIVE }
    });

    for (const game of activeGames) {
      try {
        // 현재 가격 조회
        const currentPrice = await this.priceService.getCurrentPriceBySymbol(game.symbol);
        
        if (currentPrice) {
          // 게임 종료
          game.status = GameStatus.COMPLETED;
          game.endTime = new Date();
          await this.gameRepository.save(game);

          // 모든 예측 결과 계산
          await this.calculateAllPredictions(game.id, currentPrice.price);
        }
      } catch (error) {
        console.error(`게임 ${game.id} 종료 중 오류:`, error);
      }
    }
  }

  /**
   * 게임의 모든 예측 결과 계산
   */
  private async calculateAllPredictions(gameId: string, endPrice: number): Promise<void> {
    const predictions = await this.predictionRepository.find({
      where: { gameId, status: GamePredictionStatus.PENDING }
    });

    for (const prediction of predictions) {
      try {
        prediction.updateResult(endPrice);
        await this.predictionRepository.save(prediction);

        // 사용자 점수 업데이트
        await this.updateUserScore(prediction.userId, prediction.isCorrect, prediction.score);
      } catch (error) {
        console.error(`예측 ${prediction.id} 결과 계산 중 오류:`, error);
      }
    }
  }

  /**
   * 게임 생성
   */
  async createGame(symbol: string, duration: number, userId: string): Promise<Game> {
    // 기존 활성 게임 종료
    await this.endActiveGames();

    // 현재 가격 조회
    const currentPrice = await this.priceService.getCurrentPriceBySymbol(symbol);
    
    if (!currentPrice) {
      throw new Error('가격 정보를 조회할 수 없습니다.');
    }

    // 새 게임 생성
    const endTime = new Date();
    endTime.setSeconds(endTime.getSeconds() + duration);

    const newGame = this.gameRepository.create({
      symbol: symbol.toUpperCase(),
      startTime: new Date(),
      endTime,
      duration,
      startPrice: currentPrice.price,
      status: GameStatus.ACTIVE,
      createdBy: userId
    });

    return await this.gameRepository.save(newGame);
  }

  /**
   * 게임 통계 조회
   */
  async getGameStats(gameId: string): Promise<{
    totalPredictions: number;
    upPredictions: number;
    downPredictions: number;
    correctPredictions: number;
    averageScore: number;
  }> {
    const predictions = await this.predictionRepository.find({
      where: { gameId }
    });

    const totalPredictions = predictions.length;
    const upPredictions = predictions.filter(p => p.direction === GamePredictionType.UP).length;
    const downPredictions = predictions.filter(p => p.direction === GamePredictionType.DOWN).length;
    const correctPredictions = predictions.filter(p => p.isCorrect).length;
    const averageScore = totalPredictions > 0 
      ? predictions.reduce((sum, p) => sum + p.score, 0) / totalPredictions 
      : 0;

    return {
      totalPredictions,
      upPredictions,
      downPredictions,
      correctPredictions,
      averageScore
    };
  }

  /**
   * 사용자의 게임 참여 기록
   */
  async getUserGameHistory(userId: string, page: number = 1, limit: number = 20): Promise<{
    predictions: GamePrediction[];
    total: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;

    const [predictions, total] = await this.predictionRepository.findAndCount({
      where: { userId },
      relations: ['game'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit
    });

    return {
      predictions,
      total,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * 랭킹 업데이트
   */
  async updateRankings(): Promise<void> {
    const scores = await this.scoreRepository.find({
      order: { totalScore: 'DESC' }
    });

    for (let i = 0; i < scores.length; i++) {
      scores[i].rank = i + 1;
      await this.scoreRepository.save(scores[i]);
    }
    }
    
    /**
    * 게임 결과 처리 (GameController에서 호출)
    */
    async processGameResult(gameId: string): Promise<any> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
      relations: ['predictions']
    });
    
    if (!game) {
      throw new Error('게임을 찾을 수 없습니다.');
    }
    
    // 게임에 참여한 모든 사용자에 대해 결과 업데이트
    const results = [];
    for (const prediction of game.predictions) {
      const result = await this.calculateGameResult(gameId, prediction.userId);
      results.push(result);
    }
    return results;
    }
    
    /**
    * 게임 결과 시뮤레이션 (개발용)
    */
    async simulateGameResult(gameId: string, endPrice: number): Promise<any> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
      relations: ['predictions']
    });
    
    if (!game) {
      throw new Error('게임을 찾을 수 없습니다.');
    }
    
    // 강제로 endPrice를 설정하고 결과 계산
    game.endPrice = endPrice;
    game.status = GameStatus.COMPLETED;
    await this.gameRepository.save(game);
    
    return await this.calculateGameResult(gameId, game.predictions[0]?.userId || 'test-user');
    }
    
    /**
    * 게임 디버그 정보 조회 (개발용)
    */
    async getGameDebugInfo(gameId: string): Promise<any> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
      relations: ['predictions']
    });
    
    if (!game) {
      throw new Error('게임을 찾을 수 없습니다.');
    }
    
    return {
      game: {
        id: game.id,
        symbol: game.tokenSymbol,
        startPrice: game.startPrice,
        endPrice: game.endPrice,
        status: game.status,
        duration: game.duration,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt
      },
      predictions: game.predictions?.map((p: any) => ({
        id: p.id,
        userId: p.userId,
        predictionType: p.predictionType || p.type,
        predictionPrice: p.predictionPrice || p.price,
        resultPrice: p.resultPrice || p.endPrice,
        status: p.status,
        scoreEarned: p.scoreEarned || p.score || 0,
        createdAt: p.createdAt
      })) || [],
      summary: {
        totalPredictions: game.predictions?.length || 0,
        pendingPredictions: game.predictions?.filter((p: any) => p.status === GamePredictionStatus.PENDING).length || 0,
        winningPredictions: game.predictions?.filter((p: any) => p.status === GamePredictionStatus.WIN).length || 0
      }
    };
    }
}

// 기본 export (GameController에서 사용)
export default GameService;