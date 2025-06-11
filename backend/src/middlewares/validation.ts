import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
// import { AppError } from '../utils/errors'; // TODO: 에러 클래스 구현 후 활성화
import { validateEmail, validateWalletAddress } from '../utils/validators';

// 임시 에러 클래스
class AppError extends Error {
  public statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

// 임시 로거 객체
const logger = {
  error: (message: string, meta?: any) => {
    if (meta) {
      console.error(`[ERROR] ${message}`, meta);
    } else {
      console.error(`[ERROR] ${message}`);
    }
  },
  warn: (message: string, meta?: any) => {
    if (meta) {
      console.warn(`[WARN] ${message}`, meta);
    } else {
      console.warn(`[WARN] ${message}`);
    }
  },
  info: (message: string, meta?: any) => {
    if (meta) {
      console.info(`[INFO] ${message}`, meta);
    } else {
      console.info(`[INFO] ${message}`);
    }
  }
};

/**
 * 데이터 검증 함수 (내부 사용용)
 */
function validateData(data: any, schema: Record<string, any>): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  for (const [key, rules] of Object.entries(schema)) {
    const value = data[key];
    
    // required 검사
    if (rules.required && (value === undefined || value === null || value === '')) {
      return false;
    }
    
    // 값이 있는 경우에만 추가 검증
    if (value !== undefined && value !== null && value !== '') {
      // type 검사
      if (rules.type && typeof value !== rules.type) {
        return false;
      }
      
      // maxLength 검사
      if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        return false;
      }
      
      // minLength 검사
      if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * 요청 검증 미들웨어
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: '입력값 검증 실패',
      errors: errors.array()
    });
    return;
  }
  
  next();
};

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    walletAddress?: string;
    email?: string;
  };
}

/**
 * 미션 요청 검증 미들웨어
 * @param missionType 미션 타입
 * @returns Express 미들웨어 함수
 */
export function validateMissionRequest(missionType: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      logger.info(`Validating mission request: ${missionType}`, {
        userId: req.user?.id,
        body: req.body
      });

      switch (missionType) {
        case 'wallet-install':
          validateWalletInstallRequest(req, res, next);
          break;
        
        case 'homepage-visit':
          validateHomepageVisitRequest(req, res, next);
          break;
        
        case 'retry':
          validateRetryRequest(req, res, next);
          break;
        
        default:
          throw new AppError(`지원하지 않는 미션 타입입니다: ${missionType}`, 400);
      }
    } catch (error) {
      logger.error('Error in mission request validation:', error);
      next(error);
    }
  };
}

/**
 * 월렛 설치 미션 요청 검증
 */
function validateWalletInstallRequest(
  req: AuthenticatedRequest, 
  _res: Response, 
  next: NextFunction
): void {
  try {
    const { deviceInfo } = req.body;

    // deviceInfo가 제공된 경우 검증
    if (deviceInfo) {
      const deviceSchema = {
        platform: { type: 'string', required: false, maxLength: 50 },
        version: { type: 'string', required: false, maxLength: 20 },
        model: { type: 'string', required: false, maxLength: 100 }
      };

      if (!validateData(deviceInfo, deviceSchema)) {
        throw new AppError('기기 정보 형식이 올바르지 않습니다', 400);
      }

      // 플랫폼이 제공된 경우 Android 확인
      if (deviceInfo.platform && 
          deviceInfo.platform.toLowerCase() !== 'android') {
        throw new AppError('Android 기기만 지원됩니다', 400);
      }

      // 버전이 제공된 경우 최소 버전 확인
      if (deviceInfo.version) {
        const versionNumber = parseFloat(deviceInfo.version);
        if (isNaN(versionNumber) || versionNumber < 6.0) {
          throw new AppError('Android 6.0 이상 버전이 필요합니다', 400);
        }
      }
    }

    logger.info('Wallet install request validation passed', {
      userId: req.user?.id,
      deviceInfo
    });

    next();
  } catch (error) {
    logger.error('Wallet install request validation failed:', error);
    next(error);
  }
}

/**
 * 홈페이지 방문 미션 요청 검증
 */
function validateHomepageVisitRequest(
  req: AuthenticatedRequest, 
  _res: Response, 
  next: NextFunction
): void {
  try {
    const { visitToken, visitDuration } = req.body;

    // visitToken 필수 검증
    if (!visitToken) {
      throw new AppError('방문 토큰이 필요합니다', 400);
    }

    if (typeof visitToken !== 'string') {
      throw new AppError('방문 토큰은 문자열이어야 합니다', 400);
    }

    if (visitToken.length < 10 || visitToken.length > 200) {
      throw new AppError('방문 토큰 형식이 올바르지 않습니다', 400);
    }

    // 토큰 형식 검증 (visit_로 시작해야 함)
    if (!visitToken.startsWith('visit_')) {
      throw new AppError('올바르지 않은 방문 토큰 형식입니다', 400);
    }

    // visitDuration 검증 (선택적)
    if (visitDuration !== undefined) {
      if (typeof visitDuration !== 'number') {
        throw new AppError('방문 시간은 숫자여야 합니다', 400);
      }

      if (visitDuration < 1 || visitDuration > 3600) {
        throw new AppError('방문 시간은 1초에서 3600초 사이여야 합니다', 400);
      }

      if (visitDuration < 10) {
        throw new AppError('최소 10초 이상 머물러야 합니다', 400);
      }
    }

    logger.info('Homepage visit request validation passed', {
      userId: req.user?.id,
      visitToken: visitToken.substring(0, 20) + '...', // 보안을 위해 일부만 로깅
      visitDuration
    });

    next();
  } catch (error) {
    logger.error('Homepage visit request validation failed:', error);
    next(error);
  }
}

/**
 * 미션 재시도 요청 검증
 */
function validateRetryRequest(
  req: AuthenticatedRequest, 
  _res: Response, 
  next: NextFunction
): void {
  try {
    const { missionType, deviceInfo, visitToken, visitDuration } = req.body;

    // missionType 필수 검증
    if (!missionType) {
      throw new AppError('미션 타입이 필요합니다', 400);
    }

    if (typeof missionType !== 'string') {
      throw new AppError('미션 타입은 문자열이어야 합니다', 400);
    }

    // 지원하는 미션 타입 확인
    const supportedMissionTypes = ['WALLET_INSTALL', 'HOMEPAGE_VISIT'];
    if (!supportedMissionTypes.includes(missionType)) {
      throw new AppError(`지원하지 않는 미션 타입입니다: ${missionType}`, 400);
    }

    // 미션 타입별 추가 검증
    switch (missionType) {
      case 'WALLET_INSTALL':
        // deviceInfo 검증 (월렛 설치와 동일한 로직)
        if (deviceInfo) {
          const deviceSchema = {
            platform: { type: 'string', required: false, maxLength: 50 },
            version: { type: 'string', required: false, maxLength: 20 },
            model: { type: 'string', required: false, maxLength: 100 }
          };

          if (!validateData(deviceInfo, deviceSchema)) {
            throw new AppError('기기 정보 형식이 올바르지 않습니다', 400);
          }
        }
        break;

      case 'HOMEPAGE_VISIT':
        // visitToken 검증 (홈페이지 방문과 동일한 로직)
        if (!visitToken) {
          throw new AppError('홈페이지 방문 미션에는 방문 토큰이 필요합니다', 400);
        }

        if (typeof visitToken !== 'string' || !visitToken.startsWith('visit_')) {
          throw new AppError('올바르지 않은 방문 토큰 형식입니다', 400);
        }

        if (visitDuration !== undefined) {
          if (typeof visitDuration !== 'number' || visitDuration < 10) {
            throw new AppError('방문 시간은 최소 10초 이상이어야 합니다', 400);
          }
        }
        break;
    }

    logger.info('Mission retry request validation passed', {
      userId: req.user?.id,
      missionType,
      hasDeviceInfo: !!deviceInfo,
      hasVisitToken: !!visitToken
    });

    next();
  } catch (error) {
    logger.error('Mission retry request validation failed:', error);
    next(error);
  }
}

/**
 * 공통 요청 검증 미들웨어
 * 모든 API 요청에 대한 기본 검증
 */
export function validateCommonRequest(
  req: AuthenticatedRequest, 
  _res: Response, 
  next: NextFunction
): void {
  try {
    // Content-Type 검증 (POST, PUT 요청인 경우)
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('Content-Type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new AppError('Content-Type은 application/json이어야 합니다', 400);
      }
    }

    // 요청 본문 크기 검증 (이미 express.json() 미들웨어에서 처리되지만 추가 검증)
    if (req.body && JSON.stringify(req.body).length > 10000) {
      throw new AppError('요청 본문이 너무 큽니다', 400);
    }

    // 사용자 인증 상태 검증
    if (!req.user || !req.user.id) {
      throw new AppError('인증이 필요합니다', 401);
    }

    // 사용자 ID 형식 검증
    if (typeof req.user.id !== 'string' || req.user.id.length < 1) {
      throw new AppError('올바르지 않은 사용자 ID입니다', 400);
    }

    // 사용자 이메일 검증 (제공된 경우)
    if (req.user.email && !validateEmail(req.user.email)) {
      throw new AppError('올바르지 않은 이메일 형식입니다', 400);
    }

    // 지갑 주소 검증 (제공된 경우)
    if (req.user.walletAddress && !validateWalletAddress(req.user.walletAddress)) {
      throw new AppError('올바르지 않은 지갑 주소 형식입니다', 400);
    }

    next();
  } catch (error) {
    logger.error('Common request validation failed:', error);
    next(error);
  }
}

/**
 * API 응답 형식 표준화 미들웨어
 */
export function standardizeResponse(
  _req: Request, 
  res: Response, 
  next: NextFunction
): void {
  // 응답 헬퍼 함수 추가
  res.success = function(data: any, message: string = '성공', statusCode: number = 200) {
    return this.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  };

  res.error = function(message: string, statusCode: number = 400, data: any = null) {
    return this.status(statusCode).json({
      success: false,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  };

  next();
}

/**
 * 요청 로깅 미들웨어
 */
export function requestLogger(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): void {
  const startTime = Date.now();
  
  // 요청 로깅
  logger.info(`API Request: ${req.method} ${req.originalUrl}`, {
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined
  });

  // 응답 완료 시 로깅
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`API Response: ${req.method} ${req.originalUrl}`, {
      userId: req.user?.id,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
}

// TypeScript 확장 (응답 헬퍼 함수 타입 정의)
declare global {
  namespace Express {
    interface Response {
      success(data: any, message?: string, statusCode?: number): Response;
      error(message: string, statusCode?: number, data?: any): Response;
    }
  }
}