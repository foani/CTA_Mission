// src/models/GamePrediction.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Game } from './Game';
import { User } from './User';

/**
 * 게임 예측 타입 열거형
 */
export enum GamePredictionType {
  UP = 'up',       // 상승 예측
  DOWN = 'down'    // 하락 예측
}

/**
 * 게임 예측 상태 열거형
 */
export enum GamePredictionStatus {
  PENDING = 'pending',     // 결과 대기 중
  WIN = 'win',            // 예측 성공
  LOSE = 'lose',          // 예측 실패
  CANCELLED = 'cancelled'  // 취소됨
}

/**
 * 게임 예측 메타데이터 인터페이스
 */
export interface GamePredictionMetadata {
  // 예측 시점 정보
  predictionTimestamp: number;      // 예측한 시각 (Unix timestamp)
  predictionPrice: number;          // 예측 시점의 가격
  targetPrice?: number;             // 목표 가격 (옵션)
  
  // 결과 정보
  resultTimestamp?: number;         // 결과 확정 시각
  resultPrice?: number;             // 결과 가격
  priceChange?: number;            // 가격 변화량
  priceChangePercent?: number;     // 가격 변화율 (%)
  
  // 게임 설정
  gameDuration: number;            // 게임 지속 시간 (분)
  minimumChangeThreshold?: number; // 최소 변화량 임계값
  
  // 추가 정보
  confidence?: number;             // 예측 신뢰도 (1-10)
  reasoning?: string;              // 예측 근거
  clientInfo?: {
    userAgent?: string;
    ipAddress?: string;
    timezone?: string;
  };
}

/**
 * 게임 예측 엔티티
 * 사용자가 특정 게임에서 수행한 가격 예측 정보를 저장
 */
@Entity('game_predictions')
@Index(['gameId', 'userId'], { unique: true }) // 한 게임에 한 사용자는 하나의 예측만 가능
@Index(['userId', 'createdAt'])                // 사용자별 예측 이력 조회용
@Index(['gameId', 'predictionType'])           // 게임별 예측 타입 집계용
@Index(['status', 'createdAt'])                // 상태별 조회용
export class GamePrediction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 관계 설정
  @Column('uuid')
  @Index()
  gameId: string;

  @ManyToOne(() => Game, { 
    onDelete: 'CASCADE',
    nullable: false 
  })
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @Column('uuid')
  @Index()
  userId: string;

  @ManyToOne(() => User, { 
    onDelete: 'CASCADE',
    nullable: false 
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  // 예측 정보
  @Column({
    type: 'enum',
    enum: GamePredictionType,
    nullable: false
  })
  predictionType: GamePredictionType;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: false,
    comment: '예측 시점의 가격'
  })
  predictionPrice: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
    comment: '결과 가격'
  })
  resultPrice?: number;

  // 상태 및 점수
  @Column({
    type: 'enum',
    enum: GamePredictionStatus,
    default: GamePredictionStatus.PENDING
  })
  status: GamePredictionStatus;

  @Column({
    type: 'int',
    default: 0,
    comment: '이 예측으로 획득한 점수'
  })
  scoreEarned: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: '예측 정확도 (%)'
  })
  accuracy?: number;

  // 메타데이터
  @Column({
    type: 'json',
    nullable: true
  })
  metadata?: GamePredictionMetadata;

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
    comment: '결과 확정 시각'
  })
  resolvedAt?: Date;

  // 계산된 속성들
  /**
   * 예측이 성공했는지 여부
   */
  get isWin(): boolean {
    return this.status === GamePredictionStatus.WIN;
  }

  /**
   * 예측이 완료되었는지 여부 (성공/실패 상관없이)
   */
  get isResolved(): boolean {
    return this.status === GamePredictionStatus.WIN || this.status === GamePredictionStatus.LOSE;
  }

  /**
   * 가격 변화량 계산
   */
  get priceChange(): number | null {
    if (!this.resultPrice) return null;
    return this.resultPrice - this.predictionPrice;
  }

  /**
   * 가격 변화율 계산 (%)
   */
  get priceChangePercent(): number | null {
    if (!this.resultPrice || this.predictionPrice === 0) return null;
    return ((this.resultPrice - this.predictionPrice) / this.predictionPrice) * 100;
  }

  /**
   * 예측이 맞았는지 확인
   */
  isPredictionCorrect(): boolean | null {
    if (!this.resultPrice) return null;
    
    const change = this.priceChange;
    if (change === null) return null;

    if (this.predictionType === GamePredictionType.UP) {
      return change > 0;
    } else {
      return change < 0;
    }
  }

  /**
   * 메타데이터 업데이트
   */
  updateMetadata(newMetadata: Partial<GamePredictionMetadata>): void {
    this.metadata = {
      ...this.metadata,
      ...newMetadata
    };
  }

  /**
   * 예측 결과 처리
   */
  resolveResult(resultPrice: number, scoreEarned: number = 0): void {
    this.resultPrice = resultPrice;
    this.scoreEarned = scoreEarned;
    this.resolvedAt = new Date();
    
    const isCorrect = this.isPredictionCorrect();
    this.status = isCorrect ? GamePredictionStatus.WIN : GamePredictionStatus.LOSE;
    
    // 정확도 계산
    if (this.priceChangePercent !== null) {
      this.accuracy = Math.abs(this.priceChangePercent);
    }

    // 메타데이터 업데이트
    this.updateMetadata({
      resultTimestamp: Date.now(),
      resultPrice: resultPrice,
      priceChange: this.priceChange || 0,
      priceChangePercent: this.priceChangePercent || 0
    });
    }
    
    // GameService에서 사용하는 별칭 속성들
  
  /**
  * isCorrect 별칭 (GameService 호환성)
  */
  get isCorrect(): boolean {
  return this.status === GamePredictionStatus.WIN;
  }
  
  /**
  * score 별칭 (GameService 호환성)
  */
  get score(): number {
  return this.scoreEarned;
  }
  
  /**
  * direction 별칭 (GameService 호환성)
  */
  get direction(): GamePredictionType {
  return this.predictionType;
  }
  
  /**
  * endPrice 별칭 (GameService 호환성)
  */
  get endPrice(): number | undefined {
  return this.resultPrice;
  }
  
  /**
  * updateResult 메서드 (GameService 호환성)
  */
  updateResult(resultPrice: number): void {
  this.resolveResult(resultPrice, this.calculateScore(resultPrice));
  }
  
  /**
  * 점수 계산 로직
  */
  private calculateScore(resultPrice: number): number {
  const isCorrect = this.predictionType === GamePredictionType.UP ? 
    resultPrice > this.predictionPrice : 
    resultPrice < this.predictionPrice;
  
  if (!isCorrect) return 0;
  
  // 정확도에 따른 점수 계산 (기본 100점)
  const changePercent = Math.abs((resultPrice - this.predictionPrice) / this.predictionPrice) * 100;
  const baseScore = 100;
  const accuracyBonus = Math.min(changePercent * 2, 50); // 최대 50점 보너스
  
  return Math.round(baseScore + accuracyBonus);
  }
  }