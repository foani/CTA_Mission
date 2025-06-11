import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { Prediction } from './Prediction';
import { GameScore } from './GameScore';

/**
 * 게임 상태 열거형
 */
export enum GameStatus {
  WAITING = 'waiting',       // 예측 대기 중
  ACTIVE = 'active',         // 진행 중  
  COMPLETED = 'completed',   // 완료
  CANCELLED = 'cancelled',   // 취소
  EXPIRED = 'expired'        // 만료
}

/**
 * 가격 포인트 인터페이스 (JSON으로 저장)
 */
export interface PricePoint {
  timestamp: number; // Unix timestamp
  price: number; // 실제 가격
  volume?: number; // 거래량
  marketCap?: number; // 시가총액
  apiProvider: string; // 가격 데이터 제공자 (coingecko, binance)
  networkLatency?: number; // 네트워크 지연시간 (ms)
  priceAccuracy?: number; // 가격 정확도 점수
  gameVersion?: string; // 게임 버전
}

/**
 * 게임 메타데이터 인터페이스
 */
export interface GameMetadata {
  apiProvider: string; // 가격 데이터 제공자 (coingecko, binance)
  networkLatency?: number; // 네트워크 지연시간 (ms)
  priceAccuracy?: number; // 가격 정확도 점수
  gameVersion?: string; // 게임 버전
  totalParticipants?: number; // 총 참가자 수
  winnerCount?: number; // 승자 수
  averageScore?: number; // 평균 점수
}

/**
 * Game 엔티티
 * 게임 라운드/세션의 정보를 저장 (개별 사용자 예측은 Prediction 엔티티에서 관리)
 */
@Entity('games')
@Index(['tokenSymbol', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['status', 'tokenSymbol'])
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10 })
  tokenSymbol: string; // BTC, ETH, CTA 등
  
  // GameController에서 사용하는 symbol alias
  get symbol(): string {
    return this.tokenSymbol;
  }
  
  set symbol(value: string) {
    this.tokenSymbol = value;
  }
  
  @Column({ type: 'varchar', length: 100 })
  tokenName: string; // Bitcoin, Ethereum, Catena 등
  @Column({ type: 'varchar', length: 20, default: 'standard' })
  gameType: string; // GameController에서 사용
  
  @Column({ type: 'decimal', precision: 20, scale: 8 })
  startPrice: number; // 게임 시작 가격
  
  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  endPrice?: number; // 게임 종료 가격
  

  @Column({ 
    type: 'enum', 
    enum: GameStatus, 
    default: GameStatus.WAITING 
  })
  @Index()
  status: GameStatus;

  @Column({ type: 'int' })
  duration: number; // 게임 지속 시간 (밀리초)

  @Column({ type: 'int' })
  predictionWindow: number; // 예측 가능 시간 (밀리초)

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date; // 게임 실제 시작 시간 (예측 마감 후)

  @Column({ type: 'timestamp', nullable: true })
  endedAt?: Date; // 게임 종료 시간

  @Column({ type: 'timestamp', nullable: true })
  predictionDeadline?: Date; // 예측 마감 시간

  // 가격 히스토리를 JSON으로 저장
  @Column({ type: 'json' })
  priceHistory: PricePoint[];

  // 게임 메타데이터 (확장 정보)
  @Column({ type: 'json', nullable: true })
  metadata?: GameMetadata;
  
  // GameController에서 사용하는 createdBy 필드
  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt: Date;
  
  // GameController에서 사용하는 startTime alias
  get startTime(): Date {
    return this.createdAt;
  }
  
  set startTime(value: Date) {
    this.createdAt = value;
  }
  @UpdateDateColumn()
  updatedAt: Date;
  
  // GameController에서 사용하는 endTime alias
  get endTime(): Date | undefined {
    return this.endedAt;
  }
  
  set endTime(value: Date | undefined) {
    this.endedAt = value;
  }

  // 관계 설정 - 하나의 게임에 여러 사용자 예측
  @OneToMany(() => Prediction, prediction => prediction.game, { cascade: true })
  predictions: Prediction[];
  // GameController에서 사용하는 scores 관계
  @OneToMany(() => GameScore, score => score.game, { cascade: true })
  scores: GameScore[];
  
  /**
   * 게임 지속 시간을 밀리초에서 초로 변환
   */
  get durationInSeconds(): number {
    return Math.floor(this.duration / 1000);
  }

  /**
   * 예측 윈도우를 밀리초에서 초로 변환  
   */
  get predictionWindowInSeconds(): number {
    return Math.floor(this.predictionWindow / 1000);
  }

  /**
   * 게임 진행률 계산 (0-100%)
   */
  get progressPercentage(): number {
    if (this.status === GameStatus.COMPLETED || this.status === GameStatus.CANCELLED) {
      return 100;
    }

    if (!this.startedAt) {
      return 0;
    }

    const now = new Date().getTime();
    const gameStart = this.startedAt.getTime();
    const elapsed = now - gameStart;
    
    return Math.min(Math.floor((elapsed / this.duration) * 100), 100);
  }

  /**
   * 가격 변동률 계산 (%)
   */
  get priceChangePercentage(): number {
    if (!this.endPrice) {
      return 0;
    }
    
    return ((this.endPrice - this.startPrice) / this.startPrice) * 100;
  }

  /**
   * 게임이 활성 상태인지 확인
   */
  get isActive(): boolean {
    return this.status === GameStatus.WAITING || this.status === GameStatus.ACTIVE;
  }

  /**
   * 게임이 완료된 상태인지 확인
   */
  get isCompleted(): boolean {
    return this.status === GameStatus.COMPLETED || 
           this.status === GameStatus.CANCELLED || 
           this.status === GameStatus.EXPIRED;
  }

  /**
   * 예측 기간이 종료되었는지 확인
   */
  get isPredictionClosed(): boolean {
    if (!this.predictionDeadline) {
      return false;
    }
    return new Date() > this.predictionDeadline;
  }

  /**
   * 게임 소요 시간 계산 (실제 플레이 시간)
   */
  get actualDuration(): number {
    if (!this.endedAt || !this.startedAt) {
      return 0;
    }
    
    return this.endedAt.getTime() - this.startedAt.getTime();
  }

  /**
   * 최신 가격 포인트 조회
   */
  get latestPrice(): number | null {
    if (!this.priceHistory || this.priceHistory.length === 0) {
      return null;
    }
    
    return this.priceHistory[this.priceHistory.length - 1].price;
  }

  /**
   * 참가자 수 조회
   */
  get participantCount(): number {
    return this.predictions ? this.predictions.length : 0;
  }

  /**
   * 승자 수 조회 (예측이 맞은 사람들)
   */
  get winnerCount(): number {
    if (!this.predictions || !this.isCompleted) {
      return 0;
    }

    return this.predictions.filter(prediction => 
      prediction.result === 'WIN'
    ).length;
  }

  /**
   * 게임 결과 판정 (UP/DOWN)
   */
  get gameResult(): 'UP' | 'DOWN' | 'SAME' | null {
    if (!this.endPrice) {
      return null;
    }

    if (this.endPrice > this.startPrice) {
      return 'UP';
    } else if (this.endPrice < this.startPrice) {
      return 'DOWN';
    } else {
      return 'SAME';
    }
  }

  /**
   * 예측 마감까지 남은 시간 (밀리초)
   */
  get timeUntilPredictionDeadline(): number {
    if (!this.predictionDeadline) {
      return 0;
    }
    
    const now = new Date().getTime();
    const deadline = this.predictionDeadline.getTime();
    
    return Math.max(0, deadline - now);
  }

  /**
   * 게임 종료까지 남은 시간 (밀리초)
   */
  get timeUntilEnd(): number {
    if (!this.startedAt) {
      return this.duration;
    }
    
    const now = new Date().getTime();
    const gameStart = this.startedAt.getTime();
    const gameEnd = gameStart + this.duration;
    
    return Math.max(0, gameEnd - now);
  }

  /**
   * 가격 히스토리에 새로운 포인트 추가
   */
  addPricePoint(pricePoint: PricePoint): void {
    if (!this.priceHistory) {
      this.priceHistory = [];
    }
    this.priceHistory.push(pricePoint);
    
    // 메타데이터 업데이트
    if (this.metadata) {
      this.metadata.apiProvider = pricePoint.apiProvider;
      this.metadata.networkLatency = pricePoint.networkLatency;
      this.metadata.priceAccuracy = pricePoint.priceAccuracy;
    }
  }

  /**
   * 게임 시작 처리
   */
  startGame(): void {
    this.status = GameStatus.ACTIVE;
    this.startedAt = new Date();
    
    // 예측 마감 시간 설정
    this.predictionDeadline = new Date(this.createdAt.getTime() + this.predictionWindow);
  }

  /**
   * 게임 종료 처리
   */
  endGame(finalPrice: number): void {
    this.status = GameStatus.COMPLETED;
    this.endPrice = finalPrice;
    this.endedAt = new Date();
    
    // 메타데이터 업데이트
    if (this.metadata) {
      this.metadata.totalParticipants = this.participantCount;
      this.metadata.winnerCount = this.winnerCount;
    }
  }

  /**
   * 게임 취소 처리
   */
  cancelGame(reason?: string): void {
    this.status = GameStatus.CANCELLED;
    this.endedAt = new Date();
    
    if (this.metadata && reason) {
      this.metadata.gameVersion = `cancelled: ${reason}`;
    }
  }
}