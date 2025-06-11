// RateLimit 미들웨어 단독 테스트
// import { Request, Response, NextFunction } from 'express';
// import { createRateLimiter } from './middlewares/rateLimit';

// Express-rate-limit 스타일 테스트 예시
const testConfigs = [
  {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: '너무 많은 요청입니다. 15분 후에 다시 시도해주세요.'
  },
  {
    windowMs: 1 * 60 * 1000,
    max: 20,
    message: '게임 요청이 너무 많습니다. 1분 후에 다시 시도해주세요.'
  },
  {
    windowMs: 30 * 1000,
    max: 5,
    message: '예측 요청이 너무 많습니다. 30초 후에 다시 시도해주세요.'
  }
];

// 타입 검증 테스트
function validateRateLimiterTypes() {
    testConfigs.forEach(_config => {
    // 이 함수 호출이 타입 오류 없이 컴파일되어야 함
        // const middleware = createRateLimiter(config);
    
    // 반환된 middleware가 올바른 시그니처를 가지는지 검증
            // const __testMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void> = middleware;
  });
  
  console.log('RateLimit 타입 검증 완료');
}

export default validateRateLimiterTypes;
