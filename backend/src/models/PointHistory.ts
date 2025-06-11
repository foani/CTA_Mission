// src/models/PointHistory.ts

import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';

import { PointTransactionType } from '../types/user.types';
import { User } from './User';

/**
 * 포인트 이력 엔티티
 */
@Entity('point_histories')
@Index(['userId', 'type'])
@Index(['userId', 'createdAt'])
export class PointHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    nullable: false
  })
  userId: string;

  @Column({
    type: 'int',
    nullable: false
  })
  points: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false
  })
  reason: string;

  @Column({
    type: 'enum',
    enum: PointTransactionType,
    nullable: false
  })
  @Index()
  type: PointTransactionType;

  @Column({
    type: 'uuid',
    nullable: true
  })
  relatedId?: string; // 관련 미션 ID, 게임 ID 등

  @Column({
    type: 'jsonb',
    nullable: true
  })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.pointHistories, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'userId' })
  user: User;
}