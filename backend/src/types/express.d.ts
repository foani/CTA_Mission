import { Request } from 'express';
import { User } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        walletAddress?: string;
        email?: string;
        role?: string;
      };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    walletAddress?: string;
    email?: string;
    role?: string;
  };
}

export interface MissionRequest extends AuthenticatedRequest {
  body: {
    deviceInfo?: {
      platform: string;
      version: string;
      model?: string;
    };
    visitToken?: string;
    visitDuration?: number;
  };
} 