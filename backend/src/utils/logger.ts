/**
 * Winston Logger 설정
 * 로그 레벨: error, warn, info, debug
 */

import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

// 로그 디렉토리 생성
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 로그 포맷 정의
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 콘솔 출력용 포맷 (개발 환경)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // 메타데이터가 있으면 추가
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return msg;
  })
);

// Winston logger 인스턴스 생성
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'cta-mission-backend' },
  transports: [
    // 에러 로그 파일
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // 전체 로그 파일
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// 개발 환경에서는 콘솔에도 출력
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
} else if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.json(),
  }));
}

/**
 * 로그 레벨별 헬퍼 함수들
 */

export const logError = (message: string, error?: Error | unknown): void => {
  if (error instanceof Error) {
    logger.error(message, { error: error.message, stack: error.stack });
  } else {
    logger.error(message, { error });
  }
};

export const logWarn = (message: string, meta?: Record<string, unknown>): void => {
  logger.warn(message, meta ?? {});
};

export const logInfo = (message: string, meta?: Record<string, unknown>): void => {
  logger.info(message, meta ?? {});
};

export const logDebug = (message: string, meta?: Record<string, unknown>): void => {
  logger.debug(message, meta ?? {});
};

/**
 * HTTP 요청 로거
 */
export const logHttpRequest = (req: {
  method: string;
  url: string;
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
}): void => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers?.['user-agent'],
    // body는 개발 환경에서만 로깅
    ...(process.env.NODE_ENV === 'development' && { body: req.body }),
  });
};

/**
 * HTTP 응답 로거
 */
export const logHttpResponse = (res: {
  statusCode: number;
  responseTime: number;
  method: string;
  url: string;
}): void => {
  const level = res.statusCode >= 400 ? 'error' : 'info';
  logger.log(level, 'HTTP Response', {
    statusCode: res.statusCode,
    responseTime: `${res.responseTime}ms`,
    method: res.method,
    url: res.url,
  });
};

/**
 * 데이터베이스 쿼리 로거
 */
export const logDatabaseQuery = (query: {
  sql?: string;
  params?: unknown[];
  duration?: number;
  error?: Error;
}): void => {
  if (query.error) {
    logger.error('Database Query Error', {
      sql: query.sql,
      params: query.params,
      duration: query.duration,
      error: query.error.message,
    });
  } else if (process.env.NODE_ENV === 'development') {
    logger.debug('Database Query', {
      sql: query.sql,
      params: query.params,
      duration: query.duration,
    });
  }
};

// 기본 export
export default logger;