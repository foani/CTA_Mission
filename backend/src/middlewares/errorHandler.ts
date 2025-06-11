/**
 * 글로벌 에러 핸들러 미들웨어
 * 모든 에러를 캐치하여 일관된 형식으로 응답
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * 커스텀 에러 클래스
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code ?? 'INTERNAL_SERVER_ERROR';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 비동기 핸들러 래퍼
 * Promise 거부를 자동으로 캐치
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 에러 응답 인터페이스
 */
interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    statusCode: number;
    timestamp: string;
    path?: string;
    method?: string;
    stack?: string;
  };
}

/**
 * 에러 로깅
 */
const logRequestError = (err: AppError | Error, req: Request): void => {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    statusCode: err instanceof AppError ? err.statusCode : 500,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
};

/**
 * 개발 환경 에러 응답
 */
const sendErrorDev = (err: AppError | Error, req: Request, res: Response): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  
  const response: ErrorResponse = {
    error: {
      message: err.message,
      code: err instanceof AppError ? err.code : 'INTERNAL_SERVER_ERROR',
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      stack: err.stack,
    },
  };

  res.status(statusCode).json(response);
};

/**
 * 프로덕션 환경 에러 응답
 */
const sendErrorProd = (err: AppError | Error, _req: Request, res: Response): void => {
  // 운영 에러인 경우 클라이언트에 메시지 전송
  if (err instanceof AppError && err.isOperational) {
    const response: ErrorResponse = {
      error: {
        message: err.message,
        code: err.code || 'ERROR',
        statusCode: err.statusCode,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(err.statusCode).json(response);
  } else {
    // 프로그래밍 에러인 경우 일반적인 메시지 전송
    logger.error('PROGRAMMING ERROR:', err);
    
    const response: ErrorResponse = {
      error: {
        message: '서버 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(500).json(response);
  }
};

/**
 * 특정 에러 타입 처리
 */
const handleSpecificErrors = (err: Error): AppError => {
  // JWT 에러
  if (err.name === 'JsonWebTokenError') {
    return new AppError('유효하지 않은 토큰입니다.', 401, true, 'INVALID_TOKEN');
  }
  
  if (err.name === 'TokenExpiredError') {
    return new AppError('토큰이 만료되었습니다.', 401, true, 'TOKEN_EXPIRED');
  }

  // Validation 에러
  if (err.name === 'ValidationError') {
    return new AppError('입력값이 유효하지 않습니다.', 400, true, 'VALIDATION_ERROR');
  }

  // PostgreSQL 에러
  if (err.name === 'SequelizeValidationError') {
    return new AppError('데이터베이스 유효성 검사 실패', 400, true, 'DB_VALIDATION_ERROR');
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return new AppError('중복된 데이터입니다.', 409, true, 'DUPLICATE_ERROR');
  }

  // 기본 에러
  return new AppError(err.message, 500, false);
};

/**
 * 글로벌 에러 핸들러 미들웨어
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // 이미 응답이 전송된 경우
  if (res.headersSent) {
    return;
  }

  // 에러 로깅
  logRequestError(err, req);

  // 특정 에러 타입 처리
  let error = err;
  if (!(err instanceof AppError)) {
    error = handleSpecificErrors(err);
  }
  // error는 이제 AppError 타입임을 단언 가능

  // 환경에 따른 에러 응답
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

/**
 * 404 에러 핸들러
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const error = new AppError(
    `Cannot ${req.method} ${req.originalUrl}`,
    404,
    true,
    'NOT_FOUND'
  );

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};