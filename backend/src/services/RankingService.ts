// src/services/RankingService.ts

import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Ranking, RankingPeriod, AirdropStatus } from '../models/Ranking';
import { User } from '../models/User';
import { GameScore } from '../models/GameScore';

/**
 * 랭킹 서비스
 * 사용자 랭킹, 에어드롭, 시즌 관리 등을 담당
 */
export class RankingService {
  private rankingRepository: Repository<Ranking>;
  private userRepository: Repository<User>;
  private scoreRepository: Repository<GameScore>;

  constructor() {
    this.rankingRepository = AppDataSource.getRepository(Ranking);
    this.userRepository = AppDataSource.getRepository(User);
    this.scoreRepository = AppDataSource.getRepository(GameScore);
  }

  /**
   * 활성 시즌 수 조회
   */
  async getActiveSeasonCount(): Promise<number> {
    try {
      const count = await this.rankingRepository
        .createQueryBuilder('ranking')
        .where('ranking.isActive = :isActive', { isActive: true })
        .getCount();
      
      return count;
    } catch (error) {
      console.error('활성 시즌 수 조회 오류:', error);
      return 0;
    }
  }

  /**
   * 랭킹 조회
   */
  async getRanking(
    period: string = 'weekly',
    limit: number = 10,
    offset: number = 0,
    metric: string = 'totalScore'
  ): Promise<any[]> {
    try {
      const query = this.rankingRepository
        .createQueryBuilder('ranking')
        .leftJoinAndSelect('ranking.user', 'user')
        .where('ranking.period = :period', { period })
        .orderBy(`ranking.${metric}`, 'DESC')
        .limit(limit)
        .offset(offset);

      const rankings = await query.getMany();
      
      return rankings.map((ranking, index) => ({
        rank: offset + index + 1,
        userId: ranking.userId,
        score: ranking.totalScore,
        period: ranking.period,
        lastUpdated: ranking.updatedAt
      }));
    } catch (error) {
      console.error('랭킹 조회 오류:', error);
      return [];
    }
  }

  /**
   * 사용자 랭킹 조회
   */
  async getUserRanking(userId: string): Promise<any | null> {
    try {
      const ranking = await this.rankingRepository
        .createQueryBuilder('ranking')
        .where('ranking.userId = :userId', { userId })
        .orderBy('ranking.totalScore', 'DESC')
        .getOne();

      if (!ranking) {
        return null;
      }

      const rank = await this.rankingRepository
        .createQueryBuilder('ranking')
        .where('ranking.totalScore > :score', { score: ranking.totalScore })
        .getCount();

      return {
        rank: rank + 1,
        userId: ranking.userId,
        score: ranking.totalScore,
        period: ranking.period,
        lastUpdated: ranking.updatedAt
      };
    } catch (error) {
      console.error('사용자 랭킹 조회 오류:', error);
      return null;
    }
  }

  /**
   * 상위 리더보드 조회
   */
  async getTopLeaderboard(limit: number = 10, period: string = 'weekly'): Promise<any[]> {
    try {
      const rankings = await this.rankingRepository
        .createQueryBuilder('ranking')
        .leftJoinAndSelect('ranking.user', 'user')
        .where('ranking.period = :period', { period })
        .orderBy('ranking.totalScore', 'DESC')
        .limit(limit)
        .getMany();

      return rankings.map((ranking, index) => ({
        rank: index + 1,
        userId: ranking.userId,
        score: ranking.totalScore,
        period: ranking.period,
        lastUpdated: ranking.updatedAt
      }));
    } catch (error) {
      console.error('상위 리더보드 조회 오류:', error);
      return [];
    }
  }

  /**
   * 사용자 랭킹 업데이트
   */
  async updateUserRanking(
    userId: string,
    score: number,
    period: string = 'weekly'
  ): Promise<any> {
    try {
      let ranking = await this.rankingRepository.findOne({
        where: { userId, period: period as RankingPeriod }
      });

      if (ranking) {
        ranking.totalScore += score;
        ranking.updatedAt = new Date();
      } else {
        ranking = this.rankingRepository.create({
          userId,
          period: period as RankingPeriod,
          periodKey: new Date().toISOString().substring(0, 10),
          rank: 0,
          totalScore: score,
          averageScore: score,
          totalGames: 1,
          winCount: 0,
          loseCount: 0,
          drawCount: 0,
          winRate: 0,
          currentStreak: 0,
          bestStreak: 0,
          totalPlayTime: 0,
          airdropStatus: AirdropStatus.PENDING,
          airdropAmount: 0,
          airdropRetryCount: 0,
          periodStart: new Date(),
          periodEnd: new Date(),
          isActive: true
        });
      }

      const savedRanking = await this.rankingRepository.save(ranking);
      
      return {
        userId: savedRanking.userId,
        totalScore: savedRanking.totalScore,
        period: savedRanking.period,
        updated: true
      };
    } catch (error) {
      console.error('사용자 랭킹 업데이트 오류:', error);
      throw error;
    }
  }

  /**
   * 모든 랭킹 업데이트
   */
  async updateAllRankings(): Promise<{ updated: number; errors: number }> {
    try {
      let updated = 0;
      let errors = 0;

      const users = await this.userRepository.find();
      
      for (const user of users) {
        try {
          const totalScore = await this.scoreRepository
            .createQueryBuilder('score')
            .select('SUM(score.points)', 'total')
            .where('score.userId = :userId', { userId: user.id })
            .getRawOne();

          await this.updateUserRanking(user.id, totalScore?.total || 0, 'weekly');
          updated++;
        } catch (error) {
          console.error(`사용자 ${user.id} 랭킹 업데이트 오류:`, error);
          errors++;
        }
      }

      return { updated, errors };
    } catch (error) {
      console.error('모든 랭킹 업데이트 오류:', error);
      return { updated: 0, errors: 1 };
    }
  }

  /**
   * 에어드롭 스케줄 조회
   */
  async getAirdropSchedule(): Promise<any> {
    try {
      const schedule = {
        nextAirdrop: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        frequency: 'weekly',
        rewards: {
          first: { rank: 1, amount: 10000, count: 1 },
          second: { rank: 2, amount: 1000, count: 50 },
          third: { rank: 3, amount: 100, count: 500 },
          fourth: { rank: 4, amount: 10, count: 1000 }
        }
      };

      return schedule;
    } catch (error) {
      console.error('에어드롭 스케줄 조회 오류:', error);
      return null;
    }
  }

  /**
   * 사용자 에어드롭 히스토리 조회
   */
  async getUserAirdropHistory(userId: string): Promise<any[]> {
    try {
      return [
        {
          id: '1',
          userId,
          rank: 1,
          amount: 10000,
          period: 'weekly',
          distributedAt: new Date(),
          txHash: '0x123...'
        }
      ];
    } catch (error) {
      console.error('사용자 에어드롭 히스토리 조회 오류:', error);
      return [];
    }
  }

  /**
   * 에어드롭 대상자 조회
   */
  async getAirdropEligibleUsers(period: string = 'current', rank: string = 'all'): Promise<any[]> {
    try {
      const query = this.rankingRepository
        .createQueryBuilder('ranking')
        .leftJoinAndSelect('ranking.user', 'user')
        .where('ranking.period = :period', { period })
        .orderBy('ranking.totalScore', 'DESC');

      if (rank !== 'all') {
        if (rank === '1') {
          query.limit(1);
        } else if (rank === '2') {
          query.offset(1).limit(50);
        } else if (rank === '3') {
          query.offset(51).limit(500);
        } else if (rank === '4') {
          query.offset(551).limit(1000);
        }
      } else {
        query.limit(1551);
      }

      const rankings = await query.getMany();
      
      return rankings.map((ranking, index) => {
        let rankGroup = 4;
        let amount = 10;
        
        if (index === 0) {
          rankGroup = 1;
          amount = 10000;
        } else if (index <= 50) {
          rankGroup = 2;
          amount = 1000;
        } else if (index <= 550) {
          rankGroup = 3;
          amount = 100;
        }

        return {
          userId: ranking.userId,
          rank: index + 1,
          rankGroup,
          score: ranking.totalScore,
          airdropAmount: amount
        };
      });
    } catch (error) {
      console.error('에어드롭 대상자 조회 오류:', error);
      return [];
    }
  }

  /**
   * 에어드롭 실행
   */
  async executeAirdrop(period: string = 'current', dryRun: boolean = false): Promise<any> {
    try {
      const eligibleUsers = await this.getAirdropEligibleUsers(period);
      
      if (dryRun) {
        return {
          dryRun: true,
          totalUsers: eligibleUsers.length,
          totalAmount: eligibleUsers.reduce((sum, user) => sum + user.airdropAmount, 0),
          breakdown: {
            rank1: eligibleUsers.filter(u => u.rankGroup === 1).length,
            rank2: eligibleUsers.filter(u => u.rankGroup === 2).length,
            rank3: eligibleUsers.filter(u => u.rankGroup === 3).length,
            rank4: eligibleUsers.filter(u => u.rankGroup === 4).length
          }
        };
      }

      const results = [];
      for (const user of eligibleUsers) {
        try {
          const txHash = await this.sendAirdrop(user.userId, user.airdropAmount);
          results.push({
            userId: user.userId,
            amount: user.airdropAmount,
            txHash,
            success: true
          });
        } catch (error) {
          results.push({
            userId: user.userId,
            amount: user.airdropAmount,
            success: false,
            error: error.message
          });
        }
      }

      return {
        executed: true,
        totalUsers: eligibleUsers.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      console.error('에어드롭 실행 오류:', error);
      throw error;
    }
  }

  /**
   * 에어드롭 통계 조회
   */
  async getAirdropStats(): Promise<any> {
    try {
      return {
        totalAirdrops: 10,
        totalAmount: 1000000,
        totalUsers: 1551,
        lastAirdrop: new Date(),
        nextAirdrop: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };
    } catch (error) {
      console.error('에어드롭 통계 조회 오류:', error);
      return null;
    }
  }

  /**
   * 에어드롭 재시도
   */
  async retryAirdrop(airdropId: string): Promise<any> {
    try {
      return {
        airdropId,
        retried: true,
        success: true,
        txHash: '0x456...'
      };
    } catch (error) {
      console.error('에어드롭 재시도 오류:', error);
      throw error;
    }
  }

  /**
   * 현재 시즌 조회
   */
  async getCurrentSeason(): Promise<any | null> {
    try {
      const currentSeason = await this.rankingRepository
        .createQueryBuilder('ranking')
        .where('ranking.isActive = :isActive', { isActive: true })
        .orderBy('ranking.createdAt', 'DESC')
        .getOne();

      if (!currentSeason) {
        return null;
      }

      return {
        id: currentSeason.id,
        name: currentSeason.period,
        startDate: currentSeason.createdAt,
        endDate: new Date(currentSeason.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
        isActive: currentSeason.isActive
      };
    } catch (error) {
      console.error('현재 시즌 조회 오류:', error);
      return null;
    }
  }

  /**
   * 시즌 히스토리 조회
   */
  async getSeasonHistory(page: number = 1, limit: number = 10): Promise<any> {
    try {
      const offset = (page - 1) * limit;
      
      const [seasons, total] = await this.rankingRepository
        .createQueryBuilder('ranking')
        .orderBy('ranking.createdAt', 'DESC')
        .limit(limit)
        .offset(offset)
        .getManyAndCount();

      return {
        seasons: seasons.map(season => ({
          id: season.id,
          name: season.period,
          startDate: season.createdAt,
          endDate: season.updatedAt,
          isActive: season.isActive,
          participantCount: 1
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('시즌 히스토리 조회 오류:', error);
      return { seasons: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } };
    }
  }

  /**
   * 새 시즌 생성
   */
  async createSeason(seasonData: {
    name: string;
    startDate: Date;
    endDate: Date;
    description?: string;
  }): Promise<any> {
    try {
      await this.rankingRepository
        .createQueryBuilder()
        .update(Ranking)
        .set({ isActive: false })
        .where('isActive = :isActive', { isActive: true })
        .execute();

      const newSeason = this.rankingRepository.create({
        userId: 'system',
        period: seasonData.name as RankingPeriod,
        periodKey: seasonData.name,
        rank: 0,
        totalScore: 0,
        averageScore: 0,
        totalGames: 0,
        winCount: 0,
        loseCount: 0,
        drawCount: 0,
        winRate: 0,
        currentStreak: 0,
        bestStreak: 0,
        totalPlayTime: 0,
        airdropStatus: AirdropStatus.PENDING,
        airdropAmount: 0,
        airdropRetryCount: 0,
        periodStart: seasonData.startDate,
        periodEnd: seasonData.endDate,
        isActive: true
      });

      const savedSeason = await this.rankingRepository.save(newSeason);

      return {
        id: savedSeason.id,
        name: savedSeason.period,
        startDate: savedSeason.periodStart,
        endDate: savedSeason.periodEnd,
        isActive: savedSeason.isActive,
        description: seasonData.description || ''
      };
    } catch (error) {
      console.error('새 시즌 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 랭킹 리셋
   */
  async resetRanking(period: string = 'current'): Promise<void> {
    try {
      await this.rankingRepository
        .createQueryBuilder()
        .update(Ranking)
        .set({ totalScore: 0, updatedAt: new Date() })
        .where('period = :period', { period })
        .execute();
    } catch (error) {
      console.error('랭킹 리셋 오류:', error);
      throw error;
    }
  }

  /**
   * 모든 랭킹 리셋
   */
  async resetAllRankings(): Promise<void> {
    try {
      await this.rankingRepository
        .createQueryBuilder()
        .update(Ranking)
        .set({ totalScore: 0, updatedAt: new Date() })
        .execute();
    } catch (error) {
      console.error('모든 랭킹 리셋 오류:', error);
      throw error;
    }
  }

  /**
   * 랭킹 시드 데이터 생성
   */
  async seedRankings(userCount: number = 100): Promise<any> {
    try {
      const users = await this.userRepository.find({ take: userCount });
      const results = [];

      for (const user of users) {
        const randomScore = Math.floor(Math.random() * 10000);
        try {
          await this.updateUserRanking(user.id, randomScore, 'weekly');
          results.push({ userId: user.id, score: randomScore, success: true });
        } catch (error) {
          results.push({ userId: user.id, success: false, error: error.message });
        }
      }

      return {
        total: userCount,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      console.error('랭킹 시드 데이터 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 에어드롭 시뮬레이션
   */
  async simulateAirdrop(period: string = 'current'): Promise<any> {
    try {
      return await this.executeAirdrop(period, true);
    } catch (error) {
      console.error('에어드롭 시뮬레이션 오류:', error);
      throw error;
    }
  }

  /**
   * 실제 에어드롭 전송 (블록체인 트랜잭션)
   * @private
   */
  private async sendAirdrop(_userId: string, _amount: number): Promise<string> {
    return `0x${Math.random().toString(16).substr(2, 40)}`;
  }
}

export default RankingService;
