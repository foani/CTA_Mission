// src/models/GameScore.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Game } from './Game';
import { User } from './User';
import { GamePrediction } from './GamePrediction';

/**
 * 점수 타입 열거형
 */
export enum GameScoreType {
  PREDICTION_WIN = 'prediction_win',         // 예측 성공 점수
  PREDICTION_ACCURACY = 'prediction_accuracy', // 예측 정확도 보너스
  STREAK_BONUS = 'streak_bonus',             // 연승 보너스
  SPEED_BONUS = 'speed_bonus',               // 빠른 예측 보너스
  FIRST_PLAY = 'first_play',                 // 첫 게임 보너스
  DAILY_BONUS = 'daily_bonus',               // 일일 보너스
  WEEKLY_BONUS = 'weekly_bonus',             // 주간 보너스
  PENALTY = 'penalty',                       // 패널티 (예: 어뷔징)
  ADMIN_ADJUSTMENT = 'admin_adjustment'      // 관리자 조정
}

/**
 * 점수 상태 열거형
 */
export enum GameScoreStatus {
  PENDING = 'pending',     // 점수 대기 중 (검증 필요)
  CONFIRMED = 'confirmed', // 점수 확정
  CANCELLED = 'cancelled', // 점수 취소
  DISPUTED = 'disputed'    // 점수 분쟁 중
}

/**
 * 게임 점수 메타데이터 인터페이스
 */
export interface GameScoreMetadata {
  // 점수 계산 정보
  baseScore?: number;              // 기본 점수
  bonusMultiplier?: number;        // 보너스 배수
  accuracyBonus?: number;          // 정확도 보너스
  speedBonus?: number;             // 속도 보너스
  streakCount?: number;            // 연승 횟수
  
  // 예측 관련 정보
  predictionAccuracy?: number;     // 예측 정확도 (%)
  predictionSpeed?: number;        // 예측 속도 (ms)
  priceChangePercent?: number;     // 가격 변화율
  
  // 보너스/페널티 상세
  bonusReasons?: string[];         // 보너스 사유들
  penaltyReasons?: string[];       // 페널티 사유들
  
  // 게임 컨텍스트
  gameRound?: number;              // 게임 라운드
  dailyGameCount?: number;         // 일일 게임 횟수
  weeklyGameCount?: number;        // 주간 게임 횟수
  
  // 검증 정보
  verificationRequired?: boolean;   // 검증 필요 여부
  verifiedBy?: string;             // 검증자
  verifiedAt?: number;             // 검증 시각
  
  // 추가 정보
  lastPredictionResult?: {
    isCorrect: boolean;
    score: number;
    timestamp: number;
  };
  calculationDetails?: {
    formula?: string;              // 계산 공식
    variables?: Record<string, any>; // 계산 변수들
  };
}

/**
 * 게임 점수 엔티티
 * 사용자의 게임 점수 이력을 관리하는 전용 모델
 */
@Entity('game_scores')
@Index(['userId', 'createdAt'])                // 사용자별 점수 이력 조회용
@Index(['gameId', 'userId'])                   // 게임별 사용자 점수 조회용
@Index(['scoreType', 'status'])                // 점수 타입별 상태 조회용
@Index(['status', 'createdAt'])                // 상태별 시간순 조회용
@Index(['userId', 'scoreType', 'createdAt'])   // 사용자별 점수 타입별 이력용
export class GameScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 관계 설정
  @Column('uuid')
  @Index()
  userId: string;

  @ManyToOne(() => User, { 
    onDelete: 'CASCADE',
    nullable: false 
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid', { nullable: true })
  @Index()
  gameId?: string;

  @ManyToOne(() => Game, { 
    onDelete: 'SET NULL',
    nullable: true 
  })
  @JoinColumn({ name: 'gameId' })
  game?: Game;

  @Column('uuid', { nullable: true })
  @Index()
  predictionId?: string;

  @ManyToOne(() => GamePrediction, { 
    onDelete: 'SET NULL',
    nullable: true 
  })
  @JoinColumn({ name: 'predictionId' })
  prediction?: GamePrediction;

  // 점수 정보
  @Column({
    type: 'enum',
    enum: GameScoreType,
    nullable: false
  })
  scoreType: GameScoreType;

  @Column({
    type: 'int',
    nullable: false,
    comment: '획득/차감된 점수'
  })
  points: number;

  @Column({
    type: 'int',
    default: 0,
    comment: '이 점수 이후의 총 점수'
  })
  totalPointsAfter: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: '보너스 배수'
  })
  multiplier?: number;

  // 상태 및 검증
  @Column({
    type: 'enum',
    enum: GameScoreStatus,
    default: GameScoreStatus.PENDING
  })
  status: GameScoreStatus;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '점수 설명'
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '점수 부여자 (시스템/관리자ID)'
  })
  awardedBy?: string;

  // 메타데이터
  @Column({
    type: 'json',
    nullable: true
  })
  metadata?: GameScoreMetadata;

  // 타임스탬프
  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP'
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP'
  })
  updatedAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '점수 확정 시각'
  })
  confirmedAt?: Date;

  // 계산된 속성들
  /**
   * 점수가 확정되었는지 여부
   */
  get isConfirmed(): boolean {
    return this.status === GameScoreStatus.CONFIRMED;
  }

  /**
   * 점수가 대기 중인지 여부
   */
  get isPending(): boolean {
    return this.status === GameScoreStatus.PENDING;
  }

  /**
   * 보너스 점수인지 여부
   */
  get isBonus(): boolean {
    return [
      GameScoreType.PREDICTION_ACCURACY,
      GameScoreType.STREAK_BONUS,
      GameScoreType.SPEED_BONUS,
      GameScoreType.FIRST_PLAY,
      GameScoreType.DAILY_BONUS,
      GameScoreType.WEEKLY_BONUS
    ].includes(this.scoreType);
  }

  /**
   * 페널티 점수인지 여부
   */
  get isPenalty(): boolean {
    return this.scoreType === GameScoreType.PENALTY || this.points < 0;
  }

  /**
   * 실제 점수 (배수 적용 후)
   */
  get finalPoints(): number {
    if (this.multiplier && this.multiplier !== 1) {
      return Math.round(this.points * this.multiplier);
    }
    return this.points;
  }

  /**
   * 메타데이터 업데이트
   */
  updateMetadata(newMetadata: Partial<GameScoreMetadata>): void {
    this.metadata = {
      ...this.metadata,
      ...newMetadata
    };
  }

  /**
   * 점수 확정 처리
   */
  confirm(confirmedBy?: string): void {
    this.status = GameScoreStatus.CONFIRMED;
    this.confirmedAt = new Date();
    
    if (confirmedBy) {
      this.updateMetadata({
        verifiedBy: confirmedBy,
        verifiedAt: Date.now()
      });
    }
  }

  /**
   * 점수 취소 처리
   */
  cancel(reason?: string): void {
    this.status = GameScoreStatus.CANCELLED;
    
    if (reason) {
      this.description = this.description 
        ? `${this.description} [취소사유: ${reason}]`
        : `취소사유: ${reason}`;
    }
  }

  /**
   * 점수 분쟁 처리
   */
  dispute(reason?: string): void {
    this.status = GameScoreStatus.DISPUTED;
    
    if (reason) {
      this.description = this.description 
        ? `${this.description} [분쟁사유: ${reason}]`
        : `분쟁사유: ${reason}`;
    }
  }

  /**
   * 점수 계산 상세 정보 추가
   */
  addCalculationDetails(formula: string, variables: Record<string, any>): void {
    this.updateMetadata({
      calculationDetails: {
        formula,
        variables
      }
    });
  }

  /**
   * 보너스 사유 추가
   */
  addBonusReason(reason: string): void {
    const currentReasons = this.metadata?.bonusReasons || [];
    this.updateMetadata({
      bonusReasons: [...currentReasons, reason]
    });
  }

  /**
   * 페널티 사유 추가
   */
  addPenaltyReason(reason: string): void {
    const currentReasons = this.metadata?.penaltyReasons || [];
    this.updateMetadata({
      penaltyReasons: [...currentReasons, reason]
    });
  }

  /**
   * 정적 메서드: 점수 계산
   */
  static calculatePredictionScore(
    isCorrect: boolean,
    accuracy: number,
    speed: number,
    streakCount: number = 0
  ): { baseScore: number; bonuses: number; total: number } {
    let baseScore = 0;
    let bonuses = 0;

    // 기본 점수
    if (isCorrect) {
      baseScore = 100;
    }

    // 정확도 보너스 (정확할수록 높은 점수)
    if (isCorrect && accuracy > 0) {
      bonuses += Math.min(accuracy * 0.5, 50); // 최대 50점
    }

    // 속도 보너스 (5초 이내 예측)
    if (speed < 5000) {
      bonuses += 20;
    }

    // 연승 보너스
    if (streakCount > 0) {
      bonuses += Math.min(streakCount * 10, 100); // 최대 100점
    }
    
    const total = baseScore + bonuses;
    return { baseScore, bonuses, total };
    }
    
    // GameService에서 사용하는 속성 및 메서드
    
    /**
     * rank 속성 (GameService 호환성)
     */
    @Column({ type: 'int', default: 0, comment: '랭킹 순위' })
    rank: number = 0;
    /**
     * totalScore 별칭 (GameService 호환성)
     */
    get totalScore(): number {
      return this.totalPointsAfter;
    }
    
    /**
     * 예측 결과 추가 메서드 (GameService 호환성)
     */
    addPredictionResult(isCorrect: boolean, score: number): void {
       // 기존 점수에 새 점수 추가
       this.points += score;
       this.totalPointsAfter = this.points;
       
       // 상태 업데이트
       this.status = GameScoreStatus.CONFIRMED;
       this.confirmedAt = new Date();
       
       // 메타데이터 업데이트
       this.updateMetadata({
         lastPredictionResult: {
           isCorrect,
           score,
           timestamp: Date.now()
         }
       });
       }
       }