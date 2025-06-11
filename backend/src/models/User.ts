import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { Prediction } from './Prediction';
import { Ranking } from './Ranking';
import { UserMission } from './UserMission';
import { PointHistory } from './PointHistory';

/**
 * 사용자 역할 열거형
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

/**
 * 사용자 상태 열거형
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned'
}

/**
 * 소셜 로그인 제공자 열거형
 */
export enum SocialProvider {
  GOOGLE = 'google',
  APPLE = 'apple',
  KAKAO = 'kakao',
  DISCORD = 'discord'
}

/**
 * User 엔티티
 */
@Entity('users')
@Index(['email'])
@Index(['socialId', 'socialProvider'])
@Index(['walletAddress'])
@Index(['status', 'createdAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  username?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  displayName?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  profileImage?: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  socialId: string; // Web3Auth에서 제공하는 고유 ID

  @Column({ 
    type: 'enum', 
    enum: SocialProvider 
  })
  @Index()
  socialProvider: SocialProvider;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @Index()
  walletAddress?: string; // Account Abstraction 지갑 주소

  @Column({ type: 'varchar', length: 1000, nullable: true })
  walletPrivateKey?: string; // 암호화된 프라이빗 키

  @Column({ 
    type: 'enum', 
    enum: UserRole, 
    default: UserRole.USER 
  })
  @Index()
  role: UserRole;

  @Column({ 
    type: 'enum', 
    enum: UserStatus, 
    default: UserStatus.ACTIVE 
  })
  @Index()
  status: UserStatus;

  @Column({ type: 'int', default: 0 })
  totalPoints: number; // 총 획득 포인트

  @Column({ type: 'int', default: 0 })
  gameCount: number; // 참여한 게임 수

  @Column({ type: 'int', default: 0 })
  winCount: number; // 승리한 게임 수

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalScore: number; // 총 점수

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  winRate: number; // 승률 (%)

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date; // 마지막 로그인 시간

  @Column({ type: 'timestamp', nullable: true })
  lastGameAt?: Date; // 마지막 게임 참여 시간

  @Column({ type: 'varchar', length: 10, default: 'ko' })
  preferredLanguage: string; // 선호 언어 (ko, en, ja, vi)

  @Column({ type: 'json', nullable: true })
  preferences?: Record<string, any>; // 사용자 설정
  
  // 닉네임 속성 추가
  @Column({ type: 'varchar', length: 100, nullable: true })
  nickname?: string; // 닉네임
  
  // 미션 관련 속성들 추가
  @Column({ type: 'boolean', default: false })
  missionCompleted: boolean; // 미션 완료 여부
  
  @Column({ type: 'boolean', default: false })
  walletInstalled: boolean; // 지갑 설치 여부
  
  @Column({ type: 'boolean', default: false })
  homepageVisited: boolean; // 홈페이지 방문 여부
  
  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>; // 확장 메타데이터

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 관계 설정
  @OneToMany(() => Prediction, prediction => prediction.user)
  predictions: Prediction[];

  @OneToMany(() => Ranking, ranking => ranking.user)
  rankings: Ranking[];

  @OneToMany(() => UserMission, userMission => userMission.user)
  userMissions: UserMission[];

  @OneToMany(() => PointHistory, pointHistory => pointHistory.user)
  pointHistories: PointHistory[];

  /**
   * 승률 계산 및 업데이트
   */
  updateWinRate(): void {
    if (this.gameCount === 0) {
      this.winRate = 0;
    } else {
      this.winRate = (this.winCount / this.gameCount) * 100;
    }
  }

  /**
   * 게임 참여 통계 업데이트
   */
  updateGameStats(isWin: boolean, score: number): void {
    this.gameCount += 1;
    if (isWin) {
      this.winCount += 1;
    }
    this.totalScore += score;
    this.lastGameAt = new Date();
    this.updateWinRate();
  }

  /**
   * 포인트 추가
   */
  addPoints(points: number): void {
    this.totalPoints += points;
  }

  /**
   * 포인트 차감
   */
  deductPoints(points: number): boolean {
    if (this.totalPoints >= points) {
      this.totalPoints -= points;
      return true;
    }
    return false;
  }

  /**
   * 사용자 활성화
   */
  activate(): void {
    this.status = UserStatus.ACTIVE;
  }

  /**
   * 사용자 비활성화
   */
  deactivate(): void {
    this.status = UserStatus.INACTIVE;
  }

  /**
   * 사용자 정지
   */
  suspend(): void {
    this.status = UserStatus.SUSPENDED;
  }

  /**
   * 사용자 차단
   */
  ban(): void {
    this.status = UserStatus.BANNED;
  }

  /**
   * 마지막 로그인 시간 업데이트
   */
  updateLastLogin(): void {
    this.lastLoginAt = new Date();
  }

  /**
   * 지갑 주소 설정
   */
  setWalletAddress(address: string): void {
    this.walletAddress = address;
  }

  /**
   * 사용자 설정 업데이트
   */
  updatePreferences(preferences: Record<string, any>): void {
    this.preferences = { ...this.preferences, ...preferences };
  }

  /**
   * 메타데이터 업데이트
   */
  updateMetadata(metadata: Record<string, any>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  /**
   * 사용자 프로필 업데이트
   */
  updateProfile(data: {
    username?: string;
    displayName?: string;
    profileImage?: string;
    preferredLanguage?: string;
  }): void {
    if (data.username) this.username = data.username;
    if (data.displayName) this.displayName = data.displayName;
    if (data.profileImage) this.profileImage = data.profileImage;
    if (data.preferredLanguage) this.preferredLanguage = data.preferredLanguage;
  }

  /**
   * 사용자가 활성 상태인지 확인
   */
  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  /**
   * 사용자가 관리자인지 확인
   */
  get isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /**
   * 사용자가 모더레이터인지 확인
   */
  get isModerator(): boolean {
    return this.role === UserRole.MODERATOR || this.isAdmin;
  }

  /**
   * 평균 점수 계산
   */
  get averageScore(): number {
    if (this.gameCount === 0) {
      return 0;
    }
    return this.totalScore / this.gameCount;
  }

  /**
   * 사용자 레벨 계산 (총 점수 기준)
   */
  get level(): number {
    if (this.totalScore < 100) return 1;
    if (this.totalScore < 500) return 2;
    if (this.totalScore < 1000) return 3;
    if (this.totalScore < 2000) return 4;
    if (this.totalScore < 5000) return 5;
    if (this.totalScore < 10000) return 6;
    if (this.totalScore < 20000) return 7;
    if (this.totalScore < 50000) return 8;
    if (this.totalScore < 100000) return 9;
    return 10;
  }

  /**
   * 다음 레벨까지 필요한 점수
   */
  get pointsToNextLevel(): number {
    const levelThresholds = [0, 100, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000];
    const currentLevel = this.level;
    
    if (currentLevel >= 10) {
      return 0; // 최고 레벨
    }
    
    return levelThresholds[currentLevel] - this.totalScore;
  }

  /**
   * 사용자 요약 정보 반환
   */
  getSummary(): {
    id: string;
    email: string;
    displayName: string;
    level: number;
    totalScore: number;
    winRate: number;
    gameCount: number;
    status: string;
  } {
    return {
      id: this.id,
      email: this.email,
      displayName: this.displayName || this.username || 'Anonymous',
      level: this.level,
      totalScore: this.totalScore,
      winRate: this.winRate,
      gameCount: this.gameCount,
      status: this.status
    };
  }
}