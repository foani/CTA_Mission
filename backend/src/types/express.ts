import { Request } from 'express';
import { DeviceInfo } from './common.types';

export interface AuthenticatedUser {
  id: string;
  walletAddress?: string;
  email?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface MissionRequest extends AuthenticatedRequest {
  body: {
    deviceInfo?: DeviceInfo;
    visitToken?: string;
    visitDuration?: number;
    missionId?: string;
  };
} 