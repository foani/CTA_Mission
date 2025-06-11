/**
 * Ranking Routes - 랭킹 및 에어드롭 관련 API 라우트 설정
 * 리더보드, 시즌별 랭킹, 자동 에어드롭 시스템
 */

import { Router, Request, Response } from 'express';
import { RankingController } from '../controllers/RankingController';
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middlewares/auth';
import { validateCommonRequest, requestLogger, standardizeResponse } from '../middlewares/validation';
import { createRateLimiter } from '../middlewares/rateLimit';

const router = Router();
const rankingController = new RankingController();

// 모든 라우트에 공통 미들웨어 적용
router.use(standardizeResponse);

// Rate Limiters 설정
const generalRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100회 요청
  message: '너무 많은 요청입니다. 15분 후에 다시 시도해주세요.'
});

const adminRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10분
  max: 5, // 최대 5회 요청
  message: '관리자 작업 요청이 너무 많습니다. 10분 후에 다시 시도해주세요.'
});

const airdropRateLimit = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5분
  max: 10, // 최대 10회 요청
  message: '에어드롭 관련 요청이 너무 많습니다. 5분 후에 다시 시도해주세요.'
});

/**
 * 랭킹 요청 인터페이스 정의
 */
interface RankingQuery extends Request {
  query: {
    period?: 'daily' | 'weekly' | 'monthly' | 'all';
    limit?: string;
    offset?: string;
    metric?: 'totalScore' | 'winRate' | 'gamesPlayed' | 'avgScore';
    userId?: string;
  };
}

interface AirdropHistoryQuery extends Request {
  query: {
    limit?: string;
    offset?: string;
    period?: string;
    status?: 'pending' | 'completed' | 'failed';
    userId?: string;
  };
}

interface AirdropExecuteRequest extends Request {
  body: {
    period: 'weekly' | 'monthly';
    dryRun?: boolean;
    forceExecute?: boolean;
  };
}

/**
 * GET /api/ranking/health
 * 랭킹 시스템 헬스체크
 */
router.get('/health', 
  generalRateLimit,
  rankingController.healthCheck
);

/**
 * GET /api/ranking/weekly
 * 주간 랭킹 조회
 * 
 * @query {number} [limit=100] - 조회할 랭킹 수
 * @query {number} [offset=0] - 건너뛸 랭킹 수
 * @query {string} [metric=totalScore] - 랭킹 기준
 * @returns {object} 주간 랭킹 데이터
 */
router.get('/weekly', 
  generalRateLimit,
  optionalAuthMiddleware,
  requestLogger,
  async (req: RankingQuery, res: Response) => {
    req.query.period = 'weekly';
    await rankingController.getRanking(req, res);
  }
);

/**
 * GET /api/ranking/monthly
 * 월간 랭킹 조회
 * 
 * @query {number} [limit=100] - 조회할 랭킹 수
 * @query {number} [offset=0] - 건너뛸 랭킹 수
 * @query {string} [metric=totalScore] - 랭킹 기준
 * @returns {object} 월간 랭킹 데이터
 */
router.get('/monthly', 
  generalRateLimit,
  optionalAuthMiddleware,
  requestLogger,
  async (req: RankingQuery, res: Response) => {
    req.query.period = 'monthly';
    await rankingController.getRanking(req, res);
  }
);

/**
 * GET /api/ranking/daily
 * 일일 랭킹 조회
 * 
 * @query {number} [limit=100] - 조회할 랭킹 수
 * @query {number} [offset=0] - 건너뛸 랭킹 수
 * @query {string} [metric=totalScore] - 랭킹 기준
 * @returns {object} 일일 랭킹 데이터
 */
router.get('/daily', 
  generalRateLimit,
  optionalAuthMiddleware,
  requestLogger,
  async (req: RankingQuery, res: Response) => {
    req.query.period = 'daily';
    await rankingController.getRanking(req, res);
  }
);

/**
 * GET /api/ranking/all-time
 * 전체 기간 랭킹 조회
 * 
 * @query {number} [limit=100] - 조회할 랭킹 수
 * @query {number} [offset=0] - 건너뛸 랭킹 수
 * @query {string} [metric=totalScore] - 랭킹 기준
 * @returns {object} 전체 기간 랭킹 데이터
 */
router.get('/all-time', 
  generalRateLimit,
  optionalAuthMiddleware,
  requestLogger,
  async (req: RankingQuery, res: Response) => {
    req.query.period = 'all';
    await rankingController.getRanking(req, res);
  }
);

/**
 * GET /api/ranking/user/:userId
 * 특정 사용자 랭킹 정보 조회
 * 
 * @param {string} userId - 사용자 ID
 * @query {string} [period=all] - 조회 기간
 * @returns {object} 사용자 랭킹 정보
 */
router.get('/user/:userId', 
  generalRateLimit,
  authMiddleware,
  validateCommonRequest,
  requestLogger,
  rankingController.getRanking // getUserRanking 대신 getRanking 사용
);

/**
 * GET /api/ranking/my-rank
 * 내 랭킹 정보 조회
 * 
 * @query {string} [period=all] - 조회 기간
 * @returns {object} 현재 사용자 랭킹 정보
 */
router.get('/my-rank', 
  generalRateLimit,
  authMiddleware,
  validateCommonRequest,
  requestLogger,
  rankingController.getMyRanking
);

/**
 * GET /api/ranking/leaderboard/top
 * 상위 랭커 리더보드 조회
 * 
 * @query {string} [period=weekly] - 조회 기간
 * @query {number} [limit=10] - 조회할 상위 랭커 수
 * @returns {object} 상위 랭커 정보
 */
router.get('/leaderboard/top', 
  generalRateLimit,
  optionalAuthMiddleware,
  requestLogger,
  rankingController.getTopLeaderboard
);

/**
 * GET /api/ranking/stats/overview
 * 랭킹 시스템 전체 통계
 * 
 * @returns {object} 랭킹 시스템 통계 정보
 */
router.get('/stats/overview', 
  generalRateLimit,
  optionalAuthMiddleware,
  requestLogger,
  rankingController.getRanking // getRankingStats 대신 getRanking 사용
);

/**
 * POST /api/ranking/update
 * 랭킹 수동 업데이트 (관리자 전용)
 * 
 * @body {string} [period] - 업데이트할 기간 (weekly, monthly, all)
 * @body {boolean} [forceUpdate=false] - 강제 업데이트 여부
 * @returns {object} 업데이트 결과
 */
router.post('/update', 
  adminRateLimit,
  authMiddleware,
  adminMiddleware,
  validateCommonRequest,
  requestLogger,
  rankingController.updateRankings
);

/**
 * ===============================
 * 에어드롭 관련 엔드포인트
 * ===============================
 */

/**
 * GET /api/ranking/airdrop/schedule
 * 에어드롭 스케줄 조회
 * 
 * @returns {object} 다음 에어드롭 일정 정보
 */
router.get('/airdrop/schedule', 
  generalRateLimit,
  optionalAuthMiddleware,
  requestLogger,
  rankingController.getAirdropSchedule
);

/**
 * GET /api/ranking/airdrop/history
 * 에어드롭 내역 조회
 * 
 * @query {number} [limit=20] - 조회할 내역 수
 * @query {number} [offset=0] - 건너뛸 내역 수
 * @query {string} [period] - 특정 기간 필터
 * @query {string} [status] - 상태 필터 (pending, completed, failed)
 * @query {string} [userId] - 특정 사용자 필터 (관리자만)
 * @returns {object} 에어드롭 내역
 */
router.get('/airdrop/history', 
  airdropRateLimit,
  authMiddleware,
  validateCommonRequest,
  requestLogger,
  async (req: AirdropHistoryQuery, res: Response) => {
    await rankingController.getAirdropHistory(req, res);
  }
);

/**
 * GET /api/ranking/airdrop/my-history
 * 내 에어드롭 내역 조회
 * 
 * @query {number} [limit=20] - 조회할 내역 수
 * @query {number} [offset=0] - 건너뛸 내역 수
 * @query {string} [status] - 상태 필터
 * @returns {object} 사용자 에어드롭 내역
 */
router.get('/airdrop/my-history', 
  airdropRateLimit,
  authMiddleware,
  validateCommonRequest,
  requestLogger,
  rankingController.getMyAirdropHistory
);

/**
 * GET /api/ranking/airdrop/eligible/:period
 * 에어드롭 대상자 조회 (관리자 전용)
 * 
 * @param {string} period - 조회 기간 (weekly, monthly)
 * @query {number} [limit=1000] - 조회할 대상자 수
 * @returns {object} 에어드롭 대상자 목록
 */
router.get('/airdrop/eligible/:period', 
  adminRateLimit,
  authMiddleware,
  adminMiddleware,
  validateCommonRequest,
  requestLogger,
  rankingController.getAirdropEligible
);

/**
 * POST /api/ranking/airdrop/execute
 * 에어드롭 실행 (관리자 전용)
 * 
 * @body {string} period - 실행할 기간 (weekly, monthly)
 * @body {boolean} [dryRun=false] - 시뮬레이션 실행 여부
 * @body {boolean} [forceExecute=false] - 강제 실행 여부
 * @returns {object} 에어드롭 실행 결과
 */
router.post('/airdrop/execute', 
  adminRateLimit,
  authMiddleware,
  adminMiddleware,
  validateCommonRequest,
  requestLogger,
  async (req: AirdropExecuteRequest, res: Response) => {
    await rankingController.executeAirdrop(req, res);
  }
);

/**
 * GET /api/ranking/airdrop/stats
 * 에어드롭 통계 조회 (관리자 전용)
 * 
 * @query {string} [period] - 조회 기간
 * @returns {object} 에어드롭 통계 정보
 */
router.get('/airdrop/stats', 
  adminRateLimit,
  authMiddleware,
  adminMiddleware,
  validateCommonRequest,
  requestLogger,
  rankingController.getAirdropStats
);

/**
 * POST /api/ranking/airdrop/retry/:airdropId
 * 실패한 에어드롭 재시도 (관리자 전용)
 * 
 * @param {string} airdropId - 에어드롭 ID
 * @returns {object} 재시도 결과
 */
router.post('/airdrop/retry/:airdropId', 
  adminRateLimit,
  authMiddleware,
  adminMiddleware,
  validateCommonRequest,
  requestLogger,
  rankingController.retryAirdrop
);

/**
 * ===============================
 * 시즌 관리 엔드포인트
 * ===============================
 */

/**
 * GET /api/ranking/season/current
 * 현재 시즌 정보 조회
 * 
 * @returns {object} 현재 시즌 정보
 */
router.get('/season/current', 
  generalRateLimit,
  optionalAuthMiddleware,
  requestLogger,
  rankingController.getCurrentSeason
);

/**
 * GET /api/ranking/season/history
 * 시즌 히스토리 조회
 * 
 * @query {number} [limit=10] - 조회할 시즌 수
 * @returns {object} 시즌 히스토리
 */
router.get('/season/history', 
  generalRateLimit,
  optionalAuthMiddleware,
  requestLogger,
  rankingController.getSeasonHistory
);

/**
 * POST /api/ranking/season/create
 * 새 시즌 생성 (관리자 전용)
 * 
 * @body {string} name - 시즌 이름
 * @body {Date} startDate - 시작 날짜
 * @body {Date} endDate - 종료 날짜
 * @body {number} prizePool - 상금 풀
 * @returns {object} 생성된 시즌 정보
 */
router.post('/season/create', 
  adminRateLimit,
  authMiddleware,
  adminMiddleware,
  validateCommonRequest,
  requestLogger,
  rankingController.createSeason
);

/**
 * 개발 전용 엔드포인트들 (개발 환경에서만)
 */
if (process.env.NODE_ENV === 'development') {
  /**
   * POST /api/ranking/dev/reset-rankings
   * 랭킹 데이터 초기화 (개발 환경 전용)
   */
  router.post('/dev/reset-rankings',
    adminRateLimit,
    authMiddleware,
    adminMiddleware,
    validateCommonRequest,
    requestLogger,
    rankingController.resetRankings
  );

  /**
   * POST /api/ranking/dev/seed-rankings
   * 랭킹 더미 데이터 생성 (개발 환경 전용)
   */
  router.post('/dev/seed-rankings',
    adminRateLimit,
    authMiddleware,
    adminMiddleware,
    validateCommonRequest,
    requestLogger,
    rankingController.seedRankings
  );

  /**
   * POST /api/ranking/dev/simulate-airdrop
   * 에어드롭 시뮬레이션 (개발 환경 전용)
   */
  router.post('/dev/simulate-airdrop',
    adminRateLimit,
    authMiddleware,
    adminMiddleware,
    validateCommonRequest,
    requestLogger,
    rankingController.simulateAirdrop
  );
}

export default router;