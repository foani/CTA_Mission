import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate Limiter 기본 설정 인터페이스  
interface RateLimitConfig {
  points: number; // 허용된 요청 수
  duration: number; // 시간 윈도우 (초)
  blockDuration?: number; // 차단 시간 (초)
  execEvenly?: boolean; // 고르게 분산 실행
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
 * Rate Limiter 생성 함수 오버로드 선언
 */
export function createRateLimiter(name: string, config: RateLimitConfig): RateLimiterMemory;
export function createRateLimiter(config: ExpressRateLimitConfig): (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Rate Limiter 생성 함수 구현
 */
export function createRateLimiter(
  nameOrConfig: string | ExpressRateLimitConfig, 
  config?: RateLimitConfig
): RateLimiterMemory | ((req: Request, res: Response, next: NextFunction) => Promise<void>) {
  
  // 첫 번째 오버로드: (name: string, config: RateLimitConfig) => RateLimiterMemory
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
  
  // 두 번째 오버로드: (config: ExpressRateLimitConfig) => middleware
  if (typeof nameOrConfig === 'object' && !config) {
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
          const rateLimitInfo = await limiter.get(key);
          const resetTime = rateLimitInfo
            ? new Date(Date.now() + (rateLimitInfo.msBeforeNext || 0)).toISOString()
            : new Date(Date.now() + expressConfig.windowMs).toISOString();
          res.set({
            'X-RateLimit-Limit': expressConfig.max.toString(),
            'X-RateLimit-Remaining': rateLimitInfo?.remainingPoints?.toString() || expressConfig.max.toString(),
            'X-RateLimit-Reset': resetTime
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
            'X-RateLimit-Reset': new Date(Date.now() + expressConfig.windowMs).toISOString(),
            'Retry-After': remainingTime.toString()
          });
        }
        
        res.status(429).json({
          error: 'Too Many Requests',
          message: errorMessage,
          retryAfter: remainingTime
        });
      }
    };
  }
  
  throw new Error('Invalid arguments provided to createRateLimiter');
}

/**
 * Express-style rate limiter 미들웨어 함수
 */
export function rateLimitMiddleware(name: string, config: RateLimitConfig) {
  const limiter = createRateLimiter(name, config);
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = req.ip || req.connection?.remoteAddress || 'unknown';
      await limiter.consume(key);
      next();
    } catch (rejRes: any) {
      const remainingTime = Math.round(rejRes.msBeforeNext / 1000) || 1;
      
      res.status(429).json({
        error: 'Too Many Requests',
        message: `요청 한도를 초과했습니다. ${remainingTime}초 후에 다시 시도해주세요.`,
        retryAfter: remainingTime
      });
    }
  };
}

// 사전 정의된 rate limiter들
export const generalRateLimit = rateLimitMiddleware('general', {
  points: 100, // 100번 요청
  duration: 60, // 1분
  execEvenly: true
});

export const authRateLimit = rateLimitMiddleware('auth', {
  points: 5, // 5번 시도
  duration: 900, // 15분
  blockDuration: 900 // 15분 차단
});

export const gameLimiter = rateLimitMiddleware('game', {
  points: 10, // 10번 요청
  duration: 60, // 1분
  execEvenly: true
});

export const priceRateLimit = rateLimitMiddleware('price', {
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
export async function getRateLimitStatus(name: string, key: string) {
  const limiter = rateLimiters[name];
  if (!limiter) return null;
  
  try {
    const status = await limiter.get(key);
    return status ? {
      remainingPoints: status.remainingPoints || 0,
      msBeforeNext: status.msBeforeNext || 0,
      isFirstInDuration: status.isFirstInDuration || false
    } : null;
  } catch (error) {
    return null;
  }
}

/**
 * Rate Limiter 리셋
 */
export async function resetRateLimit(name: string, key: string): Promise<boolean> {
  const limiter = rateLimiters[name];
  if (!limiter) return false;
  
  try {
    await limiter.delete(key);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 모든 Rate Limiter 상태 조회 (관리자용)
 */
export function getAllRateLimiters(): string[] {
  return Object.keys(rateLimiters);
}