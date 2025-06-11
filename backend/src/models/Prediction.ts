import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './User';
import { Game } from './Game';

/**
 * 예측 방향 열거형
 */
export enum PredictionDirection {
  UP = 'UP',     // 가격 상승 예측
  DOWN = 'DOWN'  // 가격 하락 예측
}

/**
 * 예측 결과 열거형
 */
export enum PredictionResult {
  WIN = 'WIN',   // 예측 성공
  LOSE = 'LOSE', // 예측 실패
  DRAW = 'DRAW'  // 무승부 (가격 변동 없음)
}

/**
 * 예측 상태 열거형
 */
export enum PredictionStatus {
  PENDING = 'pending',     // 대기중 (게임 진행중)
  COMPLETED = 'completed', // 완료 (결과 확정)
  CANCELLED = 'cancelled'  // 취소 (게임 취소시)
}

/**
 * 예측 메타데이터 인터페이스
 */
export interface PredictionMetadata {
  predictionConfidence?: number; // 예측 신뢰도 (1-100)
  deviceInfo?: string; // 예측한 디바이스 정보
  userAgent?: string; // 브라우저 정보
  ipAddress?: string; // IP 주소 (해시화)
  predictionTime?: number; // 예측에 걸린 시간 (ms)
  gameParticipationCount?: number; // 해당 게임에서의 참여 순서
}

/**
 * Prediction 엔티티
 * 개별 사용자의 가격 예측 정보를 저장
 */
@Entity('predictions')
@Index(['userId', 'gameId'])
@Index(['gameId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['direction', 'result'])
export class Prediction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  gameId: string;

  @Column({ 
    type: 'enum', 
    enum: PredictionDirection 
  })
  @Index()
  direction: PredictionDirection; // UP 또는 DOWN

  @Column({ 
    type: 'enum', 
    enum: PredictionResult,
    nullable: true 
  })
  result?: PredictionResult; // 예측 결과

  @Column({ 
    type: 'enum', 
    enum: PredictionStatus,
    default: PredictionStatus.PENDING 
  })
  @Index()
  status: PredictionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  score: number; // 획득 점수

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  predictionPrice: number; // 예측 시점의 가격

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  actualPrice?: number; // 실제 결과 가격

  @Column({ type: 'timestamp' })
  predictionAt: Date; // 예측 제출 시간

  @Column({ type: 'timestamp', nullable: true })
  resultConfirmedAt?: Date; // 결과 확정 시간

  // 예측 메타데이터 (확장 정보)
  @Column({ type: 'json', nullable: true })
  metadata?: PredictionMetadata;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 관계 설정
  @ManyToOne(() => User, user => user.predictions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Game, game => game.predictions)
  @JoinColumn({ name: 'gameId' })
  game: Game;

  /**
   * 예측이 정확했는지 확인
   */
  get isCorrect(): boolean {
    return this.result === PredictionResult.WIN;
  }

  /**
   * 예측이 완료되었는지 확인
   */
  get isCompleted(): boolean {
    return this.status === PredictionStatus.COMPLETED;
  }

  /**
   * 가격 변동률 계산 (%)
   */
  get priceChangePercentage(): number {
    if (!this.actualPrice) {
      return 0;
    }
    
    return ((this.actualPrice - this.predictionPrice) / this.predictionPrice) * 100;
  }

  /**
   * 예측 정확도 점수 계산
   * 가격 변동률이 클수록 높은 점수
   */
  get accuracyScore(): number {
    if (!this.isCorrect || !this.actualPrice) {
      return 0;
    }

    const priceChange = Math.abs(this.priceChangePercentage);
    
    // 기본 점수 + 변동률에 따른 보너스
    let baseScore = 10;
    
    if (priceChange >= 5) {
      baseScore += 20; // 5% 이상 변동시 보너스
    } else if (priceChange >= 2) {
      baseScore += 10; // 2% 이상 변동시 보너스
    } else if (priceChange >= 1) {
      baseScore += 5;  // 1% 이상 변동시 보너스
    }

    return baseScore;
  }

  /**
   * 예측에 걸린 시간 (예측 제출 시간 - 게임 생성 시간)
   */
  get predictionDelay(): number {
    if (!this.game) {
      return 0;
    }
    
    return this.predictionAt.getTime() - this.game.createdAt.getTime();
  }

  /**
   * 예측 방향이 실제 결과와 일치하는지 확인
   */
  checkPredictionResult(): PredictionResult | null {
    if (!this.actualPrice) {
      return null;
    }

    const priceChange = this.actualPrice - this.predictionPrice;
    
    if (priceChange === 0) {
      return PredictionResult.DRAW;
    }
    
    const actualDirection = priceChange > 0 ? PredictionDirection.UP : PredictionDirection.DOWN;
    
    return this.direction === actualDirection ? PredictionResult.WIN : PredictionResult.LOSE;
  }

  /**
   * 예측 결과 확정 처리
   */
  confirmResult(actualPrice: number, gameResult: 'UP' | 'DOWN' | 'SAME'): void {
    this.actualPrice = actualPrice;
    this.resultConfirmedAt = new Date();
    this.status = PredictionStatus.COMPLETED;

    // 결과 판정
    if (gameResult === 'SAME') {
      this.result = PredictionResult.DRAW;
      this.score = 5; // 무승부 점수
    } else {
      const isCorrect = (this.direction === PredictionDirection.UP && gameResult === 'UP') ||
                       (this.direction === PredictionDirection.DOWN && gameResult === 'DOWN');
      
      this.result = isCorrect ? PredictionResult.WIN : PredictionResult.LOSE;
      this.score = isCorrect ? this.accuracyScore : 0;
    }
  }

  /**
   * 예측 취소 처리 (게임 취소시)
   */
  cancelPrediction(): void {
    this.status = PredictionStatus.CANCELLED;
    this.result = PredictionResult.DRAW;
    this.score = 0;
  }

  /**
   * 예측 신뢰도 설정
   */
  setConfidence(confidence: number): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    
    this.metadata.predictionConfidence = Math.max(1, Math.min(100, confidence));
  }

  /**
   * 예측 메타데이터 업데이트
   */
  updateMetadata(metadata: Partial<PredictionMetadata>): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    
    Object.assign(this.metadata, metadata);
  }

  /**
   * 예측 요약 정보 반환
   */
  getSummary(): {
    direction: string;
    result: string | null;
    score: number;
    priceChange: number;
    isCorrect: boolean;
  } {
    return {
      direction: this.direction,
      result: this.result || null,
      score: this.score,
      priceChange: this.priceChangePercentage,
      isCorrect: this.isCorrect
    };
  }
}