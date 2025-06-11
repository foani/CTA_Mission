// RateLimit 미들웨어 타입 테스트 파일
import { Router } from 'express';
import { createRateLimiter } from './middlewares/rateLimit';

const router = Router();

// Express-rate-limit 스타일 테스트 (1개 객체 파라미터)
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

// 라우트에서 사용 테스트
router.get('/test1', generalRateLimit, (_req, res) => {
  res.json({ message: 'generalRateLimit 테스트' });
});

router.post('/test2', gameActionRateLimit, (_req, res) => {
  res.json({ message: 'gameActionRateLimit 테스트' });
});

router.post('/test3', predictionRateLimit, (_req, res) => {
  res.json({ message: 'predictionRateLimit 테스트' });
});

export default router;
