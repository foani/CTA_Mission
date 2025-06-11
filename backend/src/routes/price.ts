/**
 * Price Routes - 가격 관련 API 라우트 설정
 * 실시간 크립토 가격 데이터, 차트 데이터, 가격 히스토리
 */

import { Router, Request, Response } from 'express';
import { PriceController } from '../controllers/PriceController';
import { authMiddleware, optionalAuthMiddleware, adminMiddleware } from '../middlewares/auth';
import { validateCommonRequest, requestLogger, standardizeResponse } from '../middlewares/validation';
import { createRateLimiter } from '../middlewares/rateLimit';

// 요청 타입 정의
interface ChartQuery extends Request {
  params: {
    tokenSymbol: string;
  };
  query: {
    days?: string;
    interval?: string;
    vs_currency?: string;
  };
}

interface TokenHistoryQuery extends Request {
  params: {
    tokenSymbol: string;
  };
  query: {
    days?: string;
    interval?: string;
    vs_currency?: string;
  };
}
const router = Router();
const priceController = new PriceController();

// 모든 라우트에 공통 미들웨어 적용
router.use(standardizeResponse);

// Rate Limiters 설정
const generalRateLimit = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1분
  max: 60, // 최대 60회 요청 (1초당 1회)
  message: '가격 조회 요청이 너무 많습니다. 1분 후에 다시 시도해주세요.'
});

const intensiveRateLimit = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1분  
  max: 20, // 최대 20회 요청
  message: '차트 데이터 요청이 너무 많습니다. 1분 후에 다시 시도해주세요.'
});

const adminRateLimit = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5분
  max: 10, // 최대 10회 요청
  message: '관리자 작업 요청이 너무 많습니다. 5분 후에 다시 시도해주세요.'
});

/**
 * 가격 요청 인터페이스 정의
 */
interface PriceQuery extends Request {
  query: {
    tokens?: string; // 쉼표로 구분된 토큰 목록
    vs_currency?: string; // 기준 통화 (기본값: usd)
    include_24hr_change?: string; // 24시간 변화율 포함 여부
    include_market_cap?: string; // 시가총액 포함 여부
  };
}

interface ChartQuery extends Request {
  query: {
    vs_currency?: string;
    days?: string; // 조회 기간 (1, 7, 30, 90, 365)
    interval?: string; // 데이터 간격 (minutely, hourly, daily)
  };
}

// interface PriceHistoryQuery extends Request {
//   query: {
//     date?: string; // YYYY-MM-DD 형식
//     vs_currency?: string;
//   };
// }

interface AlertRequest extends Request {
  body: {
    tokenSymbol: string;
    targetPrice: number;
    condition: 'above' | 'below';
    isActive?: boolean;
  };
}

/**
 * GET /api/price/health
 * 가격 시스템 헬스체크
 */
router.get('/health', 
  generalRateLimit,
  priceController.healthCheck
);

/**
 * GET /api/price/current
 * 현재 가격 조회
 * 
 * @query {string} [tokens] - 조회할 토큰 목록 (쉼표 구분, 예: bitcoin,ethereum,cardano)
 * @query {string} [vs_currency=usd] - 기준 통화
 * @query {boolean} [include_24hr_change=true] - 24시간 변화율 포함
 * @query {boolean} [include_market_cap=false] - 시가총액 포함
 * @returns {object} 현재 가격 데이터
 */
router.get('/current', 
  generalRateLimit,
  optionalAuthMiddleware,
  requestLogger,
  async (req: PriceQuery, res: Response) => {
    await priceController.getCurrentPrice(req, res);
  }
);

/**
 * GET /api/price/supported
 * 지원하는 토큰 목록 조회
 * 
 * @returns {object} 지원하는 토큰 목록 및 메타데이터
 */
router.get('/supported', 
  generalRateLimit,
  optionalAuthMiddleware,
  requestLogger,
  priceController.getSupportedTokens
);

/**
 * GET /api/price/:tokenSymbol
 * 특정 토큰 가격 상세 조회
 * 
 * @param {string} tokenSymbol - 토큰 심볼 (예: bitcoin, ethereum)
 * @query {string} [vs_currency=usd] - 기준 통화
 * @query {boolean} [include_24hr_change=true] - 24시간 변화율 포함
 * @query {boolean} [include_market_cap=true] - 시가총액 포함
 * @returns {object} 토큰 상세 가격 정보
 */
router.get('/:tokenSymbol', 
  generalRateLimit,
  optionalAuthMiddleware,
  requestLogger,
  priceController.getTokenPrice
);

/**
 * GET /api/price/:tokenSymbol/chart
 * 토큰 차트 데이터 조회
 * 
 * @param {string} tokenSymbol - 토큰 심볼
 * @query {string} [vs_currency=usd] - 기준 통화
 * @query {string} [days=7] - 조회 기간 (1, 7, 30, 90, 365)
 * @query {string} [interval=daily] - 데이터 간격 (minutely, hourly, daily)
 * @returns {object} 차트 데이터 (가격, 시간)
 */
router.get('/:tokenSymbol/chart', 
  intensiveRateLimit,
  optionalAuthMiddleware,
  requestLogger,
  async (req: ChartQuery, res: Response) => {
    await priceController.getChartData(req, res);
  }
);

/**
 * GET /api/price/:tokenSymbol/history
 * 토큰 과거 가격 히스토리
 * 
 * @param {string} tokenSymbol - 토큰 심볼
 * @query {string} [date] - 조회 날짜 (YYYY-MM-DD)
 * @query {string} [vs_currency=usd] - 기준 통화
 * @returns {object} 과거 가격 데이터
 */
router.get('/:tokenSymbol/history', 
  intensiveRateLimit,
  optionalAuthMiddleware,
  requestLogger,
    async (req: TokenHistoryQuery, res: Response) => {
    await priceController.getPriceHistory(req, res);
  }
);

/**
 * GET /api/price/market/overview
 * 마켓 전체 개요 (시총, 거래량 등)
 * 
 * @query {string} [vs_currency=usd] - 기준 통화
 * @returns {object} 마켓 전체 통계
 */
router.get('/market/overview', 
  generalRateLimit,
  optionalAuthMiddleware,
  requestLogger,
  priceController.getMarketOverview
);

/**
 * GET /api/price/trending
 * 인기 상승 토큰 목록
 * 
 * @query {number} [limit=10] - 조회할 토큰 수
 * @returns {object} 트렌딩 토큰 목록
 */
router.get('/trending', 
  generalRateLimit,
  optionalAuthMiddleware,
  requestLogger,
  priceController.getTrendingTokens
);

/**
 * GET /api/price/gainers-losers
 * 상승/하락 상위 토큰 목록
 * 
 * @query {number} [limit=10] - 조회할 토큰 수
 * @query {string} [period=24h] - 조회 기간 (1h, 24h, 7d)
 * @returns {object} 상승/하락 토큰 목록
 */
router.get('/gainers-losers', 
  generalRateLimit,
  optionalAuthMiddleware,
  requestLogger,
  priceController.getGainersLosers
);

/**
 * ===============================
 * 가격 알림 관련 엔드포인트
 * ===============================
 */

/**
 * GET /api/price/alerts/my-alerts
 * 내 가격 알림 목록 조회
 * 
 * @returns {object} 사용자 가격 알림 목록
 */
router.get('/alerts/my-alerts', 
  generalRateLimit,
  authMiddleware,
  validateCommonRequest,
  requestLogger,
  priceController.getMyPriceAlerts
);

/**
 * POST /api/price/alerts/create
 * 가격 알림 생성
 * 
 * @body {string} tokenSymbol - 토큰 심볼
 * @body {number} targetPrice - 목표 가격
 * @body {string} condition - 조건 ('above' | 'below')
 * @body {boolean} [isActive=true] - 활성화 여부
 * @returns {object} 생성된 알림 정보
 */
router.post('/alerts/create', 
  generalRateLimit,
  authMiddleware,
  validateCommonRequest,
  requestLogger,
  async (req: AlertRequest, res: Response) => {
    await priceController.createPriceAlert(req, res);
  }
);

/**
 * PUT /api/price/alerts/:alertId
 * 가격 알림 수정
 * 
 * @param {string} alertId - 알림 ID
 * @body {number} [targetPrice] - 목표 가격
 * @body {string} [condition] - 조건
 * @body {boolean} [isActive] - 활성화 여부
 * @returns {object} 수정된 알림 정보
 */
router.put('/alerts/:alertId', 
  generalRateLimit,
  authMiddleware,
  validateCommonRequest,
  requestLogger,
  priceController.updatePriceAlert
);

/**
 * DELETE /api/price/alerts/:alertId
 * 가격 알림 삭제
 * 
 * @param {string} alertId - 알림 ID
 * @returns {object} 삭제 결과
 */
router.delete('/alerts/:alertId', 
  generalRateLimit,
  authMiddleware,
  validateCommonRequest,
  requestLogger,
  priceController.deletePriceAlert
);

/**
 * ===============================
 * 관리자 전용 엔드포인트
 * ===============================
 */

/**
 * POST /api/price/admin/refresh-cache
 * 가격 캐시 새로고침 (관리자 전용)
 * 
 * @body {string[]} [tokens] - 새로고침할 토큰 목록
 * @returns {object} 캐시 새로고침 결과
 */
router.post('/admin/refresh-cache', 
  adminRateLimit,
  authMiddleware,
  adminMiddleware,
  validateCommonRequest,
  requestLogger,
  priceController.refreshPriceCache
);

/**
 * GET /api/price/admin/api-status
 * 외부 API 상태 조회 (관리자 전용)
 * 
 * @returns {object} 외부 API 상태 정보
 */
router.get('/admin/api-status', 
  adminRateLimit,
  authMiddleware,
  adminMiddleware,
  validateCommonRequest,
  requestLogger,
  priceController.getApiStatus
);

/**
 * POST /api/price/admin/switch-provider
 * 가격 데이터 제공자 변경 (관리자 전용)
 * 
 * @body {string} provider - 제공자 (coingecko, binance)
 * @body {boolean} [fallback=true] - 폴백 사용 여부
 * @returns {object} 제공자 변경 결과
 */
router.post('/admin/switch-provider', 
  adminRateLimit,
  authMiddleware,
  adminMiddleware,
  validateCommonRequest,
  requestLogger,
  priceController.switchPriceProvider
);

/**
 * GET /api/price/admin/stats
 * 가격 서비스 통계 (관리자 전용)
 * 
 * @query {string} [period=24h] - 통계 기간
 * @returns {object} 가격 서비스 사용 통계
 */
router.get('/admin/stats', 
  adminRateLimit,
  authMiddleware,
  adminMiddleware,
  validateCommonRequest,
  requestLogger,
  priceController.getPriceServiceStats
);

/**
 * ===============================
 * WebSocket 실시간 가격 엔드포인트
 * ===============================
 */

/**
 * GET /api/price/websocket/subscribe
 * WebSocket 구독 토큰 발급
 * 
 * @body {string[]} tokens - 구독할 토큰 목록
 * @returns {object} WebSocket 연결 정보
 */
router.post('/websocket/subscribe', 
  generalRateLimit,
  optionalAuthMiddleware,
  requestLogger,
  priceController.getWebSocketSubscription
);

/**
 * 개발 전용 엔드포인트들 (개발 환경에서만)
 */
if (process.env.NODE_ENV === 'development') {
  /**
   * POST /api/price/dev/mock-price
   * 목 가격 데이터 설정 (개발 환경 전용)
   */
  router.post('/dev/mock-price',
    adminRateLimit,
    authMiddleware,
    adminMiddleware,
    validateCommonRequest,
    requestLogger,
    priceController.setMockPrice
  );

  /**
   * POST /api/price/dev/simulate-volatility
   * 가격 변동성 시뮬레이션 (개발 환경 전용)
   */
  router.post('/dev/simulate-volatility',
    adminRateLimit,
    authMiddleware,
    adminMiddleware,
    validateCommonRequest,
    requestLogger,
    priceController.simulateVolatility
  );

  /**
   * GET /api/price/dev/cache-status
   * 가격 캐시 상태 조회 (개발 환경 전용)
   */
  router.get('/dev/cache-status',
    generalRateLimit,
    authMiddleware,
    validateCommonRequest,
    requestLogger,
    priceController.getCacheStatus
  );
}

export default router;