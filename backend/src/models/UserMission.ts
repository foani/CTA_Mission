import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  ManyToOne, 
  JoinColumn 
} from 'typeorm';
import { User } from './User';
import { Mission } from './Mission';

@Entity('user_missions')
export class UserMission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'uuid',
    nullable: false
  })
  userId!: string;

  @Column({
    type: 'uuid',
    nullable: false
  })
  missionId!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'locked'
  })
  status!: 'locked' | 'in_progress' | 'completed' | 'claimed';

  @Column({
    type: 'int',
    default: 0
  })
  progress!: number; // 0-100 퍼센트

  @Column({
    type: 'int',
    default: 0
  })
  pointsEarned!: number;

  @Column({
    type: 'timestamp',
    nullable: true
  })
  startedAt?: Date | null;

  @Column({
    type: 'timestamp',
    nullable: true
  })
  completedAt?: Date | null;

  @Column({
    type: 'timestamp',
    nullable: true
  })
  claimedAt?: Date | null;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '미션 완료 관련 메타데이터 (검증 정보, 추가 데이터 등)'
  })
  metadata?: any;

  // 관계 설정
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Mission)
  @JoinColumn({ name: 'missionId' })
  mission!: Mission;

  @CreateDateColumn({
    name: 'created_at'
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at'
  })
  updatedAt!: Date;
}