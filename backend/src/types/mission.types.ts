// src/types/mission.types.ts

import { MissionMetadata, DeviceInfo } from './common.types';

/**
 * 미션 타입 정의
 */
export enum MissionType {
  WALLET_INSTALL = 'WALLET_INSTALL',
  HOMEPAGE_VISIT = 'HOMEPAGE_VISIT',
  SOCIAL_SHARE = 'SOCIAL_SHARE',
  GAME_PARTICIPATION = 'GAME_PARTICIPATION'
}

/**
 * 미션 상태 정의
 */
export interface MissionStatus {
  walletInstalled: boolean;
  homepageVisited: boolean;
  allMissionsCompleted: boolean;
  totalPoints: number;
  completionDate: Date | null;
}

/**
 * 미션 카테고리 정의
 */
export enum MissionCategory {
  ONBOARDING = 'ONBOARDING',
  ENGAGEMENT = 'ENGAGEMENT',
  SOCIAL = 'SOCIAL',
  GAME = 'GAME'
}

/**
 * 미션 기본 인터페이스
 */
export interface Mission {
  id: string;
  type: MissionType;
  category: MissionCategory;
  title: string;
  description: string;
  rewardPoints: number;
  iconUrl?: string;
  isActive: boolean;
  order: number;
  startDate?: Date;
  endDate?: Date;
  maxCompletions?: number;
  requirements?: MissionRequirement[];
  metadata?: MissionMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 미션 요구사항 인터페이스
 */
export interface MissionRequirement {
  type: 'minLevel' | 'hasWallet' | 'completedMission';
  value: number | boolean;
}

/**
 * 사용자 미션 진행 상태 인터페이스
 */
export interface UserMission {
  id: string;
  userId: string;
  missionId: string;
  completed: boolean;
  completedAt: Date | null;
  visitToken: string | null;
  visitDuration: number | null;
  deviceInfo: DeviceInfo | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 미션 완료 인터페이스
 */
export interface MissionCompletion {
  missionType: MissionType;
  completed: boolean;
  rewardPoints: number;
  completedAt?: Date;
  message: string;
}

/**
 * 미션 진행 인터페이스
 */
export interface MissionProgress {
  totalMissions: number;
  completedMissions: number;
  progressPercentage: number;
  missions: Array<{
    id: string;
    type: MissionType;
    title: string;
    description: string;
    rewardPoints: number;
    completed: boolean;
    completedAt: Date | null;
  }>;
}

/**
 * 미션 생성 DTO
 */
export interface CreateMissionDto {
  type: MissionType;
  category: MissionCategory;
  title: string;
  description: string;
  points: number;
  iconUrl?: string;
  startDate?: Date;
  endDate?: Date;
  maxCompletions?: number;
  requirements?: MissionRequirement[];
}

/**
 * 미션 업데이트 DTO
 */
export interface UpdateMissionDto {
  title?: string;
  description?: string;
  points?: number;
  iconUrl?: string;
  status?: MissionStatus;
  startDate?: Date;
  endDate?: Date;
  maxCompletions?: number;
  requirements?: MissionRequirement[];
}

/**
 * 미션 검증 요청 DTO
 */
export interface VerifyMissionDto {
  missionId: string;
  userId: string;
  data?: Record<string, any>;
}

/**
 * 미션 검증 결과
 */
export interface MissionVerificationResult {
  success: boolean;
  message: string;
  pointsEarned?: number;
  completionCount?: number;
  metadata?: Record<string, any>;
}

/**
 * 미션 필터링 옵션
 */
export interface MissionFilterOptions {
  category?: MissionCategory;
  status?: MissionStatus;
  type?: MissionType;
  userId?: string;
  includeCompleted?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * 페이지네이션된 미션 응답
 */
export interface PaginatedMissionsResponse {
  missions: Mission[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * 미션 통계
 */
export interface MissionStatistics {
  totalMissions: number;
  completedMissions: number;
  totalPointsEarned: number;
  completionRate: number;
  categoryBreakdown: Record<MissionCategory, number>;
}