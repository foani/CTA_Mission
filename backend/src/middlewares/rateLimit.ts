import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

interface RateLimitConfig {
  points: number; // 허용 요청 수
  duration: number; // 시간 윈도우 (초)
  blockDuration?: number; // 차단 시간 (초)
  execEvenly?: boolean; // 균등 분배 여부
}

// Express-rate-limit 스타일 인터페이스
interface ExpressRateLimitConfig {
  windowMs: number; // 시간 윈도우 (밀리초)
  max: number; // 최대 요청 수
  message?: string; // 오류 메시지
  standardHeaders?: boolean; // 표준 헤더 사용 여부
  legacyHeaders?: boolean; // 레거시 헤더 사용 여부
}

// 기본 rate limiter 인스턴스들
const rateLimiters: { [key: string]: RateLimiterMemory } = {};

/**
 * createRateLimiter 함수 오버로드 선언
 */
// 기존 방식 (2개 파라미터)
export function createRateLimiter(name: string, config: RateLimitConfig): RateLimiterMemory;

// Express-rate-limit 스타일 (1개 객체 파라미터)
export function createRateLimiter(config: ExpressRateLimitConfig): (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * createRateLimiter 함수 구현
 */
export function createRateLimiter(
  nameOrConfig: string | ExpressRateLimitConfig, 
  config?: RateLimitConfig
): RateLimiterMemory | ((req: Request, res: Response, next: NextFunction) => Promise<void>) {
  
  // 기존 방식: 2개 파라미터 (name, config)
  if (typeof nameOrConfig === 'string' && config) {
    const name = nameOrConfig;
    
    if (!rateLimiters[name]) {
      rateLimiters[name] = new RateLimiterMemory({
        points: config.points,
        duration: config.duration,
        blockDuration: config.blockDuration || config.duration,
        execEvenly: config.execEvenly || false
      });
    }
    
    return rateLimiters[name];
  }
  
  // Express-rate-limit 스타일: 1개 객체 파라미터
  else if (typeof nameOrConfig === 'object') {
    const expressConfig = nameOrConfig as ExpressRateLimitConfig;
    
    // 고유한 이름 생성 (config 기반)
    const name = `express_${expressConfig.windowMs}_${expressConfig.max}`;
    
    if (!rateLimiters[name]) {
      rateLimiters[name] = new RateLimiterMemory({
        points: expressConfig.max,
        duration: Math.ceil(expressConfig.windowMs / 1000), // 밀리초를 초로 변환
        blockDuration: Math.ceil(expressConfig.windowMs / 1000),
        execEvenly: false
      });
    }
    
    const limiter = rateLimiters[name];
    const errorMessage = expressConfig.message || '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const key = req.ip || req.connection?.remoteAddress || 'unknown';
        
        await limiter.consume(key);
        
        // 표준 헤더 설정 (선택적)
        if (expressConfig.standardHeaders !== false) {
          const remainingHits = (await limiter.get(key))?.remainingPoints || expressConfig.max;
          res.set({
            'X-RateLimit-Limit': expressConfig.max.toString(),
            'X-RateLimit-Remaining': remainingHits.toString(),
            'X-RateLimit-Reset': new Date(Date.now() + expressConfig.windowMs).toISOString()
          });
        }
        
        next();
      } catch (rejRes: any) {
        const remainingTime = Math.round(rejRes.msBeforeNext / 1000) || 1;
        
        // 표준 헤더 설정
        if (expressConfig.standardHeaders !== false) {
          res.set({
            'X-RateLimit-Limit': expressConfig.max.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + rejRes.msBeforeNext).toISOString(),
            'Retry-After': remainingTime.toString()
          });
        }
        
        res.status(429).json({
          success: false,
          message: errorMessage,
          error: 'TOO_MANY_REQUESTS',
          retryAfter: remainingTime
        });
      }
    };
  }
  
  // 잘못된 파라미터
  else {
    throw new Error('Invalid parameters for createRateLimiter');
  }
}

/**
 * Rate Limiting 미들웨어 생성 함수 (기존 방식)
 */
export function rateLimitMiddleware(limiterName: string, config: RateLimitConfig) {
  const limiter = createRateLimiter(limiterName, config);
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = req.ip || req.connection?.remoteAddress || 'unknown';
      
      await limiter.consume(key);
      next();
    } catch (rejRes: any) {
      const remainingTime = Math.round(rejRes.msBeforeNext / 1000) || 1;
      
      res.status(429).json({
        success: false,
        message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        error: 'TOO_MANY_REQUESTS',
        retryAfter: remainingTime
      });
    }
  };
}

// 사전 정의된 rate limiters
export const authLimiter = rateLimitMiddleware('auth', {
  points: 5, // 5번 시도
  duration: 900, // 15분
  blockDuration: 900 // 15분 차단
});

export const gameLimiter = rateLimitMiddleware('game', {
  points: 10, // 10번 요청
  duration: 60, // 1분
  execEvenly: true
});

export const priceLimiter = rateLimitMiddleware('price', {
  points: 100, // 100번 요청
  duration: 60 // 1분
});

export const missionLimiter = rateLimitMiddleware('mission', {
  points: 20, // 20번 요청
  duration: 300, // 5분
  execEvenly: true
});

export const rankingLimiter = rateLimitMiddleware('ranking', {
  points: 50, // 50번 요청
  duration: 60, // 1분
  execEvenly: true
});

// 개발/디버그용 제한 없는 미들웨어
export const noRateLimit = (_req: Request, _res: Response, next: NextFunction): void => {
  next();
};

/**
 * Rate Limiter 상태 조회
 */
export async function getRateLimiterStatus(key: string, limiterName: string): Promise<{
  totalHits: number;
  remainingPoints: number;
  msBeforeNext: number;
} | null> {
  const limiter = rateLimiters[limiterName];
  if (!limiter) return null;
  
  try {
    const status = await limiter.get(key);
    return status ? {
      totalHits: (status as any).totalHits || 0,
      remainingPoints: status.remainingPoints || 0,
      msBeforeNext: status.msBeforeNext || 0
    } : null;
  } catch (error) {
    return null;
  }
}

/**
 * Rate Limiter 리셋 (개발/관리자용)
 */
export async function resetRateLimit(key: string, limiterName?: string): Promise<boolean> {
  try {
    if (limiterName && rateLimiters[limiterName]) {
      await rateLimiters[limiterName].delete(key);
      return true;
    } else {
      // 모든 리미터에서 키 삭제
      for (const limiter of Object.values(rateLimiters)) {
        await limiter.delete(key);
      }
      return true;
    }
  } catch (error) {
    return false;
  }
}