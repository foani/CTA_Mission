/**
 * Mission Routes - 미션 관련 API 라우트 설정 (미들웨어 적용)
 * MissionController와 완전 연동, 보안 및 검증 미들웨어 적용
 */

import { Router, Request, Response } from 'express';
import { MissionController } from '../controllers/MissionController';
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middlewares/auth';
import { validateMissionRequest, validateCommonRequest, requestLogger, standardizeResponse } from '../middlewares/validation';
import { createRateLimiter } from '../middlewares/rateLimit';

const router = Router();
const missionController = new MissionController();

// 모든 라우트에 공통 미들웨어 적용
router.use(standardizeResponse);

// Rate Limiters 설정
const generalRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100회 요청
  message: '너무 많은 요청입니다. 15분 후에 다시 시도해주세요.'
});

const missionCheckRateLimit = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5분
  max: 10, // 최대 10회 요청
  message: '미션 확인 요청이 너무 많습니다. 5분 후에 다시 시도해주세요.'
});

const strictRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10분
  max: 5, // 최대 5회 요청
  message: '관리자 작업 요청이 너무 많습니다. 10분 후에 다시 시도해주세요.'
});

/**
 * 미션 헬스체크 (인증 불필요)
 * GET /api/missions/health
 */
router.get('/health', generalRateLimit, missionController.healthCheck);

/**
 * 모든 미션 목록 조회 (선택적 인증)
 * GET /api/missions
 */
router.get('/', 
  generalRateLimit, 
  optionalAuthMiddleware, 
  missionController.getAllMissions
);

/**
 * 사용자별 미션 현황 조회 (인증 필수)
 * GET /api/missions/status/:userId
 */
router.get('/status/:userId', 
  generalRateLimit,
  authMiddleware,
  validateCommonRequest,
  requestLogger,
  missionController.getUserMissionStatus
);

/**
 * 사용자 랭킹 조회 (선택적 인증)
 * GET /api/missions/ranking?limit=100
 */
router.get('/ranking', 
  generalRateLimit,
  optionalAuthMiddleware,
  missionController.getUserRanking
);

/**
 * 미션 통계 조회 (관리자 전용)
 * GET /api/missions/statistics
 */
router.get('/statistics', 
  generalRateLimit,
  authMiddleware,
  adminMiddleware,
  missionController.getMissionStatistics
);

/**
 * 지갑 설치 확인 (인증 필수 + Rate Limiting)
 * POST /api/missions/check-wallet
 * 
 * Body:
 * {
 *   "userId": "string",
 *   "deviceInfo": {
 *     "userAgent": "string",
 *     "platform": "string",
 *     "language": "string",
 *     "timezone": "string"
 *   }
 * }
 */
router.post('/check-wallet', 
  missionCheckRateLimit,
  authMiddleware,
  validateCommonRequest,
  validateMissionRequest('wallet-install'),
  requestLogger,
  missionController.checkWalletInstallation
);

/**
 * 홈페이지 방문 확인 (인증 필수 + Rate Limiting)
 * POST /api/missions/check-homepage
 * 
 * Body:
 * {
 *   "userId": "string",
 *   "visitToken": "string",
 *   "deviceInfo": {
 *     "userAgent": "string",
 *     "platform": "string",
 *     "language": "string",
 *     "timezone": "string"
 *   }
 * }
 */
router.post('/check-homepage', 
  missionCheckRateLimit,
  authMiddleware,
  validateCommonRequest,
  validateMissionRequest('homepage-visit'),
  requestLogger,
  missionController.checkHomepageVisit
);

/**
 * 사용자 랭킹 업데이트 (관리자 전용 + 엄격한 Rate Limiting)
 * POST /api/missions/update-rankings
 */
router.post('/update-rankings', 
  strictRateLimit,
  authMiddleware,
  adminMiddleware,
  missionController.updateUserRankings
);

/**
 * 미션 완료 처리 (인증 필수 + Rate Limiting)
 * POST /api/missions/:missionId/complete
 * 
 * Body:
 * {
 *   "userId": "string",
 *   "deviceInfo": {
 *     "userAgent": "string",
 *     "platform": "string",
 *     "language": "string",
 *     "timezone": "string"
 *   }
 * }
 */
router.post('/:missionId/complete', 
  missionCheckRateLimit,
  authMiddleware,
  validateCommonRequest,
  validateMissionRequest, // 미션별 동적 검증 (인자 제거)
  requestLogger,
  missionController.completeMission
);

/**
 * 개발 전용 엔드포인트들 (개발 환경에서만)
 */
if (process.env.NODE_ENV === 'development') {
  /**
   * 개발용 미션 초기화 (개발 환경 전용)
   * POST /api/missions/dev/reset
   */
  router.post('/dev/reset',
    strictRateLimit,
    authMiddleware,
    // adminMiddleware, // TODO: 관리자 미들웨어 구현 후 활성화
    // missionController.resetMissionsForDev // TODO: 메서드 구현 후 활성화
    (_req: Request, res: Response) => {
      res.json({ success: true, message: '개발용 미션 초기화 - 미구현' });
    }
  );
  

  /**
   * 개발용 더미 데이터 생성 (개발 환경 전용)
   * POST /api/missions/dev/seed
   */
  router.post('/dev/seed',
    strictRateLimit,
    authMiddleware,
    // adminMiddleware, // TODO: 관리자 미들웨어 구현 후 활성화
    // missionController.seedMissionData // TODO: 메서드 구현 후 활성화
        (_req: Request, res: Response) => {
      res.json({ success: true, message: '개발용 더미 데이터 생성 - 미구현' });
    }
  );
}

export default router;