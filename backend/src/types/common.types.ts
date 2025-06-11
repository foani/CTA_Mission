export interface BaseMetadata {
  createdAt: string;
  updatedAt: string;
  version: string;
}

export interface DeviceInfo {
  platform: string;
  version: string;
  model?: string;
  manufacturer?: string;
  osVersion?: string;
  appVersion?: string;
  deviceId?: string;
  userAgent?: string;
  androidApiLevel?: number;
  browserName?: string;
  browserVersion?: string;
  screenResolution?: string;
  language?: string;
  timezone?: string;
}

export interface VisitInfo {
  duration: number;
  timestamp: string;
  ip?: string;
  userAgent?: string;
}

export interface UserMetadata extends BaseMetadata {
  lastLoginIp?: string;
  deviceInfo?: DeviceInfo;
  preferences?: {
    language: string;
    notifications: boolean;
  };
}

export interface MissionMetadata extends BaseMetadata {
  completionCriteria: {
    type: string;
    value: number | string | boolean;
  };
  rewardInfo: {
    points: number;
    type: string;
  };
}

export interface ValidationSchema {
  [key: string]: {
    type: string;
    required?: boolean;
    maxLength?: number;
    minLength?: number;
    pattern?: RegExp;
    enum?: string[];
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}