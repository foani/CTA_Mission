/**
 * CTA Mission Backend Server
 * 메인 엔트리 포인트
 */

import dotenv from 'dotenv';
// 환경변수 로드 (가장 먼저 실행)
dotenv.config();

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';

// 설정 및 유틸리티 import
import { logger } from './utils/logger';
import { errorHandler } from './middlewares/errorHandler';
import { initializeDatabase, closeDatabaseConnection, checkDatabaseHealth } from './config/database';

// 서비스 import
import { MissionService } from './services/MissionService';

// 라우트 import
import missionRoutes from './routes/mission';
// Express 앱 초기화
const app: Application = express();
const httpServer = createServer(app);

// WebSocketService 초기화 (Socket.IO 대체)


// 포트 설정
const PORT = parseInt(process.env.PORT || '3000', 10);

/**
 * 미들웨어 설정
 */
const setupMiddlewares = (): void => {
  // 보안 헤더 설정
  app.use(helmet());

  // CORS 설정
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // 요청 로깅
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) }
    }));
  }

  // Body 파싱
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting (미션 API는 제외)
  // app.use('/api/', rateLimiter);  // 임시 비활성화
};

/**
 * 라우트 설정
 */
const setupRoutes = (): void => {
  // Health check 엔드포인트
  app.get('/health', async (_req, res) => {
    try {
      const dbHealth = await checkDatabaseHealth();
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        database: dbHealth
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Database health check failed'
      });
    }
  });

  // API 버전 정보
  app.get('/api/v1', (_req, res) => {
    res.json({
      version: '1.0.0',
      name: 'CTA Mission API',
      description: '크립토 가격 예측 게임 및 미션 시스템 API',
    });
  });
  
  // 라우트 등록
  // 테스트용 헬스 체크 라우트 (인증 불필요)
  app.get('/api/v1/health', async (_req, res) => {
    try {
      const dbHealth = await checkDatabaseHealth();
      res.json({
        success: true,
        message: '서버가 정상적으로 작동 중입니다',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        database: dbHealth.status
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        message: '데이터베이스 연결에 문제가 있습니다',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // 미션 라우트 등록
  app.use('/api/v1/missions', missionRoutes);

  // 404 핸들러
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    });
  });

  // 글로벌 에러 핸들러
  app.use(errorHandler);
};

/**
 * 서비스 초기화
 */
const initializeServices = async (): Promise<void> => {
  try {
    // MissionService 초기화
    await MissionService.getInstance().initializeRepositories();
    logger.info('MissionService 초기화 완료');
    
    // 다른 서비스들도 여기서 초기화할 수 있습니다
    // await GameService.getInstance().initialize();
    // await RankingService.getInstance().initialize();
    
    logger.info('모든 서비스 초기화 완료');
  } catch (error) {
    logger.error('서비스 초기화 실패:', error);
    throw error;
  }
};

/**
 * 서버 시작
 */
const startServer = async (): Promise<void> => {
  try {
    logger.info('🔄 서버 초기화를 시작합니다...');
    
    // 1단계: 데이터베이스 연결
    logger.info('1단계: 데이터베이스 연결 중...');
    await initializeDatabase();
    logger.info('✅ 데이터베이스 연결 성공');
    
    // 2단계: 서비스 초기화
    logger.info('2단계: 서비스 초기화 중...');
    await initializeServices();
    logger.info('✅ 서비스 초기화 성공');
    
    // 3단계: 미들웨어 설정
    logger.info('3단계: 미들웨어 설정 중...');
    setupMiddlewares();
    logger.info('✅ 미들웨어 설정 완료');
    
    // 4단계: 라우트 설정
    logger.info('4단계: 라우트 설정 중...');
    setupRoutes();

    // 6단계: HTTP 서버 시작
    httpServer.listen(PORT, () => {
      logger.info(`
        🚀 CTA Mission Server 가동 완료!
        🌍 Environment: ${process.env.NODE_ENV}
        🔧 Port: ${PORT}
        📡 API: http://localhost:${PORT}/api/v1
        🏥 Health: http://localhost:${PORT}/health
        🔌 WebSocket: ws://localhost:${PORT}
        🏆 리더보드: 실시간 업데이트 준비완료
        
        ✅ 모든 시스템이 정상적으로 초기화되었습니다.
      `);
    });
    
  } catch (error) {
    logger.error('❌ 서버 시작 실패:', error);
    
    // 정리 작업
    try {
      await closeDatabaseConnection();
    } catch (cleanupError) {
      logger.error('정리 작업 중 오류:', cleanupError);
    }
    
    process.exit(1);
  }
};

/**
 * Graceful shutdown
 */
const gracefulShutdown = async (): Promise<void> => {
  logger.info('🔄 서버 종료 신호를 받았습니다...');

  httpServer.close(() => {
    logger.info('✅ HTTP 서버가 종료되었습니다');
    // webSocketService.shutdown(); // ← 이 줄을 삭제 또는 주석 처리
    // logger.info('✅ Socket.io 서버가 종료되었습니다'); // 이 줄도 같이 주석 처리
  });

  try {
    await closeDatabaseConnection();
    logger.info('✅ 데이터베이스 연결이 종료되었습니다');
  } catch (error) {
    logger.error('❌ 데이터베이스 연결 종료 중 오류:', error);
  }

  logger.info('🏁 서버가 정상적으로 종료되었습니다');
  process.exit(0);

  setTimeout(() => {
    logger.error('⚠️  30초 후 강제 종료합니다');
    process.exit(1);
  }, 30000);
};

// 프로세스 시그널 처리
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// 처리되지 않은 Promise 거부 처리
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // 개발 환경에서는 프로세스 종료하지 않음
  if (process.env.NODE_ENV === 'production') {
    gracefulShutdown();
  }
});

// 처리되지 않은 예외 처리
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  gracefulShutdown();
});

// 서버 시작
startServer();