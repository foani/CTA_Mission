import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { User } from './User';

/**
 * 랭킹 기간 열거형
 */
export enum RankingPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly', 
  MONTHLY = 'monthly',
  ALL_TIME = 'all_time'
}

/**
 * 랭킹 지표 열거형
 */
export enum RankingMetric {
  TOTAL_SCORE = 'total_score',
  WIN_RATE = 'win_rate',
  GAMES_PLAYED = 'games_played',
  AVG_SCORE = 'avg_score',
  STREAK = 'streak'
}

/**
 * 에어드롭 상태 열거형
 */
export enum AirdropStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * 랭킹 통계 인터페이스
 */
export interface RankingStats {
  totalGames: number;
  winCount: number;
  loseCount: number;
  drawCount: number;
  winRate: number;
  averageScore: number;
  bestStreak: number;
  currentStreak: number;
  accuracyByToken: Record<string, number>;
  totalPlayTime: number; // 총 플레이 시간 (분)
}

/**
 * 에어드롭 정보 인터페이스
 */
export interface AirdropInfo {
  eligibleRank: number;
  airdropAmount: number;
  transactionHash?: string;
  processedAt?: Date;
  failureReason?: string;
  retryCount: number;
}

/**
 * Ranking 엔티티
 * 기간별 사용자 랭킹 정보를 저장
 */
@Entity('rankings')
@Unique(['userId', 'period', 'periodKey'])
@Index(['period', 'periodKey', 'rank'])
@Index(['period', 'periodKey', 'totalScore'])
@Index(['userId', 'period'])
export class Ranking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  userId: string;

  @Column({ 
    type: 'enum', 
    enum: RankingPeriod 
  })
  @Index()
  period: RankingPeriod;

  @Column({ 
    type: 'varchar', 
    length: 20,
    comment: '기간 키 (예: 2025-01, 2025-W01, 2025-01-01)' 
  })
  @Index()
  periodKey: string;

  @Column({ type: 'int' })
  @Index()
  rank: number; // 해당 기간 내 순위

  @Column({ type: 'int', nullable: true })
  previousRank?: number; // 이전 기간 순위

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  @Index()
  totalScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  averageScore: number;

  @Column({ type: 'int' })
  totalGames: number;

  @Column({ type: 'int' })
  winCount: number;

  @Column({ type: 'int' })
  loseCount: number;

  @Column({ type: 'int' })
  drawCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  winRate: number; // 승률 (%)

  @Column({ type: 'int' })
  currentStreak: number; // 현재 연승

  @Column({ type: 'int' })
  bestStreak: number; // 최고 연승

  @Column({ type: 'int', default: 0 })
  totalPlayTime: number; // 총 플레이 시간 (분)

  // 에어드롭 관련 정보
  @Column({ 
    type: 'enum', 
    enum: AirdropStatus, 
    default: AirdropStatus.PENDING 
  })
  airdropStatus: AirdropStatus;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  airdropAmount: number; // 에어드롭 받을 CTA 양

  @Column({ type: 'varchar', length: 100, nullable: true })
  transactionHash?: string; // 에어드롭 트랜잭션 해시

  @Column({ type: 'timestamp', nullable: true })
  airdropProcessedAt?: Date; // 에어드롭 처리 시간

  @Column({ type: 'varchar', length: 500, nullable: true })
  airdropFailureReason?: string; // 에어드롭 실패 사유

  @Column({ type: 'int', default: 0 })
  airdropRetryCount: number; // 에어드롭 재시도 횟수

  // 상세 통계 (JSON)
  @Column({ type: 'json', nullable: true })
  detailedStats?: RankingStats;

  // 기간 시작/종료 시간
  @Column({ type: 'timestamp' })
  periodStart: Date;

  @Column({ type: 'timestamp' })
  periodEnd: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
  
  // 활성 상태 속성 추가
  @Column({ type: 'boolean', default: true })
  isActive: boolean; // 랭킹 활성 상태
  
  // 관계 설정
  @ManyToOne(() => User, user => user.rankings)
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * 순위 변동 계산
   */
  get rankChange(): number {
    if (!this.previousRank) {
      return 0;
    }
    return this.previousRank - this.rank; // 양수면 상승, 음수면 하락
  }

  /**
   * 순위 변동 방향
   */
  get rankDirection(): 'up' | 'down' | 'same' | 'new' {
    if (!this.previousRank) {
      return 'new';
    }

    const change = this.rankChange;
    if (change > 0) return 'up';
    if (change < 0) return 'down';
    return 'same';
  }

  /**
   * 에어드롭 자격 여부 확인
   */
  get isEligibleForAirdrop(): boolean {
    // 1등 1명, 2등 50명, 3등 500명, 4등 1000명
    if (this.rank === 1) return true;
    if (this.rank <= 51) return true; // 2-51등
    if (this.rank <= 551) return true; // 52-551등  
    if (this.rank <= 1551) return true; // 552-1551등
    return false;
  }

  /**
   * 에어드롭 등급 계산
   */
  get airdropTier(): 1 | 2 | 3 | 4 | null {
    if (this.rank === 1) return 1;
    if (this.rank <= 51) return 2;
    if (this.rank <= 551) return 3;
    if (this.rank <= 1551) return 4;
    return null;
  }

  /**
   * 기본 에어드롭 금액 계산 (환경 변수 기반)
   */
  get baseAirdropAmount(): number {
    const tier = this.airdropTier;
    if (!tier) return 0;

    switch (tier) {
      case 1: return parseFloat(process.env.AIRDROP_1ST_PLACE_AMOUNT || '10000');
      case 2: return parseFloat(process.env.AIRDROP_2ND_PLACE_AMOUNT || '1000'); 
      case 3: return parseFloat(process.env.AIRDROP_3RD_PLACE_AMOUNT || '100');
      case 4: return parseFloat(process.env.AIRDROP_4TH_PLACE_AMOUNT || '10');
      default: return 0;
    }
  }

  /**
   * 게임 참여도 점수 (0-100)
   */
  get participationScore(): number {
    // 게임 수, 승률, 연승을 종합한 참여도 점수
    const gameScore = Math.min(this.totalGames / 10, 1) * 40; // 게임 수 (최대 40점)
    const winRateScore = this.winRate * 0.4; // 승률 (최대 40점)
    const streakScore = Math.min(this.bestStreak / 5, 1) * 20; // 연승 (최대 20점)
    
    return Math.round(gameScore + winRateScore + streakScore);
  }

  /**
   * 평균 게임 시간 (분)
   */
  get averageGameTime(): number {
    if (this.totalGames === 0) return 0;
    return Math.round((this.totalPlayTime / this.totalGames) * 100) / 100;
  }

  /**
   * 활동 등급
   */
  get activityLevel(): 'inactive' | 'casual' | 'active' | 'hardcore' {
    if (this.totalGames === 0) return 'inactive';
    if (this.totalGames < 10) return 'casual';
    if (this.totalGames < 50) return 'active';
    return 'hardcore';
  }

  /**
   * 랭킹 정보를 JSON으로 직렬화
   */
  toJSON(): object {
    return {
      id: this.id,
      userId: this.userId,
      period: this.period,
      periodKey: this.periodKey,
      rank: this.rank,
      previousRank: this.previousRank,
      rankChange: this.rankChange,
      rankDirection: this.rankDirection,
      totalScore: Number(this.totalScore),
      averageScore: Number(this.averageScore),
      totalGames: this.totalGames,
      winCount: this.winCount,
      loseCount: this.loseCount,
      drawCount: this.drawCount,
      winRate: Number(this.winRate),
      currentStreak: this.currentStreak,
      bestStreak: this.bestStreak,
      totalPlayTime: this.totalPlayTime,
      averageGameTime: this.averageGameTime,
      participationScore: this.participationScore,
      activityLevel: this.activityLevel,
      airdropStatus: this.airdropStatus,
      airdropAmount: Number(this.airdropAmount),
      airdropTier: this.airdropTier,
      isEligibleForAirdrop: this.isEligibleForAirdrop,
      baseAirdropAmount: this.baseAirdropAmount,
      transactionHash: this.transactionHash,
      airdropProcessedAt: this.airdropProcessedAt,
      airdropFailureReason: this.airdropFailureReason,
      airdropRetryCount: this.airdropRetryCount,
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * 랭킹 요약 정보 (리더보드용)
   */
  toLeaderboard(): object {
    return {
      rank: this.rank,
      rankChange: this.rankChange,
      rankDirection: this.rankDirection,
      userId: this.userId,
      totalScore: Number(this.totalScore),
      winRate: Number(this.winRate),
      totalGames: this.totalGames,
      currentStreak: this.currentStreak,
      participationScore: this.participationScore,
      activityLevel: this.activityLevel,
      user: this.user ? {
        nickname: this.user.nickname,
        profileImage: this.user.profileImage
      } : null
    };
  }

  /**
   * 에어드롭 정보만 추출
   */
  toAirdropInfo(): AirdropInfo {
    return {
      eligibleRank: this.rank,
      airdropAmount: Number(this.airdropAmount),
      transactionHash: this.transactionHash,
      processedAt: this.airdropProcessedAt,
      failureReason: this.airdropFailureReason,
      retryCount: this.airdropRetryCount
    };
  }

  /**
   * 기간 키 생성 헬퍼 메서드
   */
  static generatePeriodKey(period: RankingPeriod, date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (period) {
      case RankingPeriod.DAILY:
        return `${year}-${month}-${day}`;
      
      case RankingPeriod.WEEKLY:
        const weekNumber = getWeekNumber(date);
        return `${year}-W${String(weekNumber).padStart(2, '0')}`;
      
      case RankingPeriod.MONTHLY:
        return `${year}-${month}`;
      
      case RankingPeriod.ALL_TIME:
        return 'all-time';
      
      default:
        throw new Error(`Invalid period: ${period}`);
    }
  }

  /**
   * 기간 시작/종료 날짜 계산
   */
  static getPeriodRange(period: RankingPeriod, periodKey: string): { start: Date; end: Date } {
    const now = new Date();

    switch (period) {
      case RankingPeriod.DAILY:
        const [year, month, day] = periodKey.split('-').map(Number);
        const start = new Date(year, month - 1, day, 0, 0, 0);
        const end = new Date(year, month - 1, day, 23, 59, 59);
        return { start, end };

      case RankingPeriod.WEEKLY:
        // 주간 계산 로직 (간단화)
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return { start: weekStart, end: weekEnd };

      case RankingPeriod.MONTHLY:
        const [mYear, mMonth] = periodKey.split('-').map(Number);
        const monthStart = new Date(mYear, mMonth - 1, 1, 0, 0, 0);
        const monthEnd = new Date(mYear, mMonth, 0, 23, 59, 59);
        return { start: monthStart, end: monthEnd };

      case RankingPeriod.ALL_TIME:
        return { 
          start: new Date('2024-01-01'), 
          end: new Date('2099-12-31') 
        };

      default:
        throw new Error(`Invalid period: ${period}`);
    }
  }
}

/**
 * 주차 계산 헬퍼 함수
 */
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const daysDifference = Math.floor((date.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((daysDifference + firstDayOfYear.getDay() + 1) / 7);
}