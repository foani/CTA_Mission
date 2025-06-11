/**
 * Game Routes - 게임 관련 API 라우트 설정
 * 업다운 가격 예측 게임 시스템
 */

import { Router, Request, Response } from 'express';
import { GameController } from '../controllers/GameController';
import { GamePredictionType } from '../models/GamePrediction';
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth';
import { validateCommonRequest, requestLogger, standardizeResponse } from '../middlewares/validation';
import { createRateLimiter } from '../middlewares/rateLimit';

// 요청 타입 정의
interface StartGameRequest extends Request {
  body: {
    symbol: string;      // GameController와 일치
    duration: number;    // GameController와 일치 (필수)
    gameType?: string;   // GameController와 일치
  };
}

interface PredictRequest extends Request {
  body: {
    gameId: string;
    prediction: GamePredictionType;
    confidence?: number;
  };
}

const router = Router();
const gameController = new GameController();

// 모든 라우트에 공통 미들웨어 적용
router.use(standardizeResponse);

// Rate Limiters 설정
const generalRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100회 요청
  message: '너무 많은 요청입니다. 15분 후에 다시 시도해주세요.'
});

const gameActionRateLimit = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1분
  max: 20, // 최대 20회 요청
  message: '게임 요청이 너무 많습니다. 1분 후에 다시 시도해주세요.'
});

const predictionRateLimit = createRateLimiter({
  windowMs: 30 * 1000, // 30초
  max: 5, // 최대 5회 예측
  message: '예측 요청이 너무 많습니다. 30초 후에 다시 시도해주세요.'
});





interface GameHistoryQuery extends Request {
  query: {
    limit?: string;
    offset?: string;
    tokenSymbol?: string;
    status?: 'active' | 'completed' | 'cancelled';
    sortBy?: 'createdAt' | 'score' | 'endedAt';
    sortOrder?: 'asc' | 'desc';
  };
}

/**
 * GET /api/game/health
 * 게임 시스템 헬스체크
 */
router.get('/health', 
  generalRateLimit,
  gameController.healthCheck
);

/**
 * POST /api/game/start
 * 새 게임 시작 (미션 완료 필수)
 * 
 * @body {string} tokenSymbol - 예측할 토큰 심볼 (예: bitcoin, ethereum)
 * @body {number} [duration] - 게임 지속 시간 (분, 기본값: 5)
 * @returns {object} 시작된 게임 정보
 */
router.post('/start', 
  gameActionRateLimit,
  authMiddleware,
  validateCommonRequest,
  requestLogger,
  async (req: StartGameRequest, res: Response) => {
    await gameController.startGame(req, res);
  }
);

/**
 * POST /api/game/predict
 * 가격 예측 제출
 * 
 * @body {string} gameId - 게임 ID
 * @body {'UP'|'DOWN'} prediction - 가격 예측 방향
 * @body {number} [confidence] - 예측 신뢰도 (0-100)
 * @returns {object} 예측 제출 결과
 */
router.post('/predict', 
  predictionRateLimit,
  authMiddleware,
  validateCommonRequest,
  requestLogger,
  async (req: PredictRequest, res: Response) => {
    await gameController.submitPrediction(req, res);
  }
);

/**
 * GET /api/game/active
 * 현재 진행 중인 게임 조회
 * 
 * @returns {object} 진행 중인 게임 목록
 */
router.get('/active', 
  generalRateLimit,
  authMiddleware,
  validateCommonRequest,
  requestLogger,
  gameController.getActiveGames
);

/**
 * GET /api/game/history
 * 게임 기록 조회
 * 
 * @query {number} [limit=20] - 조회할 게임 수
 * @query {number} [offset=0] - 건너뛸 게임 수
 * @query {string} [tokenSymbol] - 특정 토큰 필터
 * @query {string} [status] - 게임 상태 필터
 * @query {string} [sortBy=createdAt] - 정렬 기준
 * @query {string} [sortOrder=desc] - 정렬 순서
 * @returns {object} 게임 기록 목록
 */
router.get('/history', 
  generalRateLimit,
  authMiddleware,
  validateCommonRequest,
  requestLogger,
  async (req: GameHistoryQuery, res: Response) => {
    await gameController.getGameHistory(req, res);
  }
);

/**
 * GET /api/game/:gameId
 * 특정 게임 상세 정보 조회
 * 
 * @param {string} gameId - 게임 ID
 * @returns {object} 게임 상세 정보
 */
router.get('/:gameId', 
  generalRateLimit,
  authMiddleware,
  validateCommonRequest,
  requestLogger,
  gameController.getGameDetail
);

/**
 * POST /api/game/:gameId/cancel
 * 게임 취소 (진행 중인 게임만)
 * 
 * @param {string} gameId - 게임 ID
 * @returns {object} 취소 결과
 */
router.post('/:gameId/cancel', 
  gameActionRateLimit,
  authMiddleware,
  validateCommonRequest,
  requestLogger,
  gameController.cancelGame
);

/**
 * GET /api/game/stats/user
 * 사용자 게임 통계 조회
 * 
 * @returns {object} 사용자별 게임 통계
 */
router.get('/stats/user', 
  generalRateLimit,
  authMiddleware,
  validateCommonRequest,
  requestLogger,
  gameController.getUserStats
);

/**
 * GET /api/game/stats/global
 * 전체 게임 통계 조회 (선택적 인증)
 * 
 * @returns {object} 전체 게임 통계
 */
router.get('/stats/global', 
  generalRateLimit,
  optionalAuthMiddleware,
  requestLogger,
  gameController.getGlobalStats
);

/**
 * GET /api/game/leaderboard
 * 게임 리더보드 조회
 * 
 * @query {number} [limit=100] - 조회할 사용자 수
 * @query {string} [period=weekly] - 기간 (daily, weekly, monthly, all)
 * @query {string} [metric=score] - 정렬 기준 (score, winRate, totalGames)
 * @returns {object} 리더보드 데이터
 */
router.get('/leaderboard', 
  generalRateLimit,
  optionalAuthMiddleware,
  requestLogger,
  gameController.getLeaderboard
);

/**
 * POST /api/game/result/:gameId
 * 게임 결과 처리 (시스템용 - 관리자만)
 * 
 * @param {string} gameId - 게임 ID
 * @returns {object} 결과 처리 완료
 */
router.post('/result/:gameId', 
  gameActionRateLimit,
  authMiddleware,
  // adminMiddleware, // TODO: 관리자 미들웨어 구현 후 활성화
  validateCommonRequest,
  requestLogger,
  gameController.processGameResult
);

/**
 * GET /api/game/tokens/supported
 * 지원하는 토큰 목록 조회
 * 
 * @returns {object} 지원 토큰 목록
 */
router.get('/tokens/supported', 
  generalRateLimit,
  optionalAuthMiddleware,
  gameController.getSupportedTokens
);

/**
 * 개발 전용 엔드포인트들 (개발 환경에서만)
 */
if (process.env.NODE_ENV === 'development') {
  /**
   * POST /api/game/dev/simulate-result
   * 게임 결과 시뮬레이션 (개발 환경 전용)
   */
  router.post('/dev/simulate-result',
    gameActionRateLimit,
    authMiddleware,
    validateCommonRequest,
    requestLogger,
    gameController.simulateGameResult
  );

  /**
   * POST /api/game/dev/reset-user-stats
   * 사용자 게임 통계 초기화 (개발 환경 전용)
   */
  router.post('/dev/reset-user-stats',
    gameActionRateLimit,
    authMiddleware,
    validateCommonRequest,
    requestLogger,
    gameController.resetUserStats
  );

  /**
   * GET /api/game/dev/debug/:gameId
   * 게임 디버그 정보 조회 (개발 환경 전용)
   */
  router.get('/dev/debug/:gameId',
    generalRateLimit,
    authMiddleware,
    validateCommonRequest,
    requestLogger,
    gameController.getGameDebugInfo
  );
}

export default router;