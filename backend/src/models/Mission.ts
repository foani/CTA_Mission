import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { MissionType } from '../types/mission.types';
import { UserMission } from './UserMission';

@Entity('missions')
export class Mission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: MissionType,
    nullable: false
  })
  type: MissionType;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false
  })
  title: string;

  @Column({
    type: 'text',
    nullable: false
  })
  description: string;

  @Column({
    type: 'int',
    nullable: false,
    default: 0
  })
  rewardPoints: number;

  @Column({
    type: 'int',
    nullable: false,
    default: 0
  })
  order: number;
  
  @Column({
    type: 'int',
    nullable: false,
    default: 0
  })
  points: number;

  @Column({
    type: 'boolean',
    nullable: false,
    default: true
  })
  isActive: boolean;

  @CreateDateColumn({
    type: 'timestamp',
    nullable: false
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    nullable: false
  })
  updatedAt: Date;

  @OneToMany(() => UserMission, userMission => userMission.mission)
  userMissions: UserMission[];
} 