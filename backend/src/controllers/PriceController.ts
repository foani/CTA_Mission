// src/controllers/PriceController.ts

import { Request, Response } from 'express';
import { PriceService } from '../services/PriceService';

// 요청 타입 정의
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    walletAddress: string;
    role: string;
  };
}

interface PriceQuery extends Request {
  query: {
    tokens?: string;
    vs_currency?: string;
    include_24hr_change?: string;
    include_market_cap?: string;
  };
}

interface ChartQuery extends Request {
  params: {
    tokenSymbol: string;
  };
  query: {
    vs_currency?: string;
    days?: string;
    interval?: string;
  };
}

interface HistoryQuery extends Request {
  params: {
    tokenSymbol: string;
  };
  query: {
    days?: string;
    interval?: string;
    vs_currency?: string;
  };
}

interface AlertRequest extends AuthenticatedRequest {
  body: {
    tokenSymbol: string;
    targetPrice: number;
    condition: 'above' | 'below';
    isActive?: boolean;
  };
}

/**
 * 가격 관련 API 컨트롤러
 * 실시간 가격 조회, 히스토리 데이터, 알림 설정 등
 */
export class PriceController {
  private priceService: PriceService;

  constructor() {
    this.priceService = new PriceService();
  }

  /**
   * 가격 시스템 헬스체크
   * GET /api/price/health
   */
  async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      const status = await this.priceService.healthCheck();
      
      res.json({
        success: true,
        status: status ? 'healthy' : 'degraded',
        data: {
          timestamp: new Date().toISOString(),
          priceService: status ? 'healthy' : 'degraded',
          supportedTokens: await this.priceService.getSupportedTokens()
        }
      });
    } catch (error) {
      console.error('Price health check 오류:', error);
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        message: '가격 서비스 상태 확인 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 현재 가격 조회
   * GET /api/price/current
   */
  async getCurrentPrice(req: PriceQuery, res: Response): Promise<void> {
    try {
      const { 
        tokens, 
        vs_currency = 'usd', 
        include_24hr_change = 'true', 
        include_market_cap = 'false' 
      } = req.query;

      if (!tokens) {
        res.status(400).json({
          success: false,
          message: '토큰 목록이 필요합니다. (예: ?tokens=bitcoin,ethereum,cardano)'
        });
        return;
      }

      // string으로 타입 확정
      const tokenList = tokens.split(',').map(token => token.trim().toLowerCase());
      
      const priceData = await this.priceService.getMultiplePrices(
        tokenList,
        vs_currency,
        include_24hr_change === 'true',
        include_market_cap === 'true'
      );

      res.json({
        success: true,
        data: priceData,
        message: '현재 가격 조회 성공'
      });
    } catch (error) {
      console.error('현재 가격 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '현재 가격 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 지원하는 토큰 목록 조회
   * GET /api/price/supported
   */
  async getSupportedTokens(_req: Request, res: Response): Promise<void> {
    try {
      const tokens = await this.priceService.getSupportedTokens();

      res.json({
        success: true,
        data: {
          tokens,
          count: tokens.length,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('지원 토큰 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '지원 토큰 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 특정 토큰 가격 상세 조회
   * GET /api/price/:tokenSymbol
   */
  async getTokenPrice(req: Request, res: Response): Promise<void> {
    try {
      const { tokenSymbol } = req.params;
      const { 
        vs_currency: _vs_currency = 'usd',
        include_24hr_change: _include_24hr_change = 'true',
        include_market_cap: _include_market_cap = 'true'
      } = req.query;

      if (!tokenSymbol) {
        res.status(400).json({
          success: false,
          message: '토큰 심볼이 필요합니다.'
        });
        return;
      }

      const priceData = await this.priceService.getCurrentPriceBySymbol(
        tokenSymbol.toLowerCase()
      );

      if (!priceData) {
        res.status(404).json({
          success: false,
          message: '해당 토큰의 가격 정보를 찾을 수 없습니다.'
        });
        return;
      }

      res.json({
        success: true,
        data: priceData
      });
    } catch (error) {
      console.error('토큰 가격 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '토큰 가격 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 토큰 차트 데이터 조회
   * GET /api/price/:tokenSymbol/chart
   */
  async getChartData(req: ChartQuery, res: Response): Promise<void> {
    try {
      const { tokenSymbol } = req.params;
      const {
        vs_currency: _vs_currency = 'usd',
        days = '7',
        interval = 'daily'
      } = req.query;

      if (!tokenSymbol) {
        res.status(400).json({
          success: false,
          message: '토큰 심볼이 필요합니다.'
        });
        return;
      }

      const chartData = await this.priceService.getChartData(
        tokenSymbol.toLowerCase(),
        'usd', // vsCurrency
        parseInt(days as string), // days (number)
        interval as string // interval
      );

      res.json({
        success: true,
        data: chartData
      });
    } catch (error) {
      console.error('차트 데이터 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '차트 데이터 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 가격 히스토리 조회
   * GET /api/price/:tokenSymbol/history
   */
  async getPriceHistory(req: HistoryQuery, res: Response): Promise<void> {
    try {
      const { tokenSymbol } = req.params;
      const {
        days = '1',
        interval: _interval = '1h',
        vs_currency: _vs_currency = 'usd'
      } = req.query;

      if (!tokenSymbol) {
        res.status(400).json({
          success: false,
          message: '토큰 심볼이 필요합니다.'
        });
        return;
      }

      const historyData = await this.priceService.getPriceHistory(
        tokenSymbol.toLowerCase(),
        days as string, // date string
        'usd' // vsCurrency
      );
      
      res.json({
        success: true,
        data: historyData
      });
    } catch (error) {
      console.error('가격 히스토리 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '가격 히스토리 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 시장 개요 조회
   * GET /api/price/market/overview
   */
  async getMarketOverview(_req: Request, res: Response): Promise<void> {
    try {
      const marketData = await this.priceService.getMarketOverview();

      res.json({
        success: true,
        data: marketData
      });
    } catch (error) {
      console.error('시장 개요 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '시장 개요 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 트렌딩 토큰 조회
   * GET /api/price/trending
   */
  async getTrendingTokens(req: Request, res: Response): Promise<void> {
    try {
      const { limit = '10' } = req.query;
      const trendingData = await this.priceService.getTrendingTokens(parseInt(limit as string));

      res.json({
        success: true,
        data: trendingData
      });
    } catch (error) {
      console.error('트렌딩 토큰 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '트렌딩 토큰 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 상승/하락 토큰 조회
   * GET /api/price/gainers-losers
   */
  async getGainersLosers(req: Request, res: Response): Promise<void> {
    try {
      const { type = 'both', limit = '10' } = req.query;
      const data = await this.priceService.getGainersLosers(type as string, parseInt(limit as string));

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('상승/하락 토큰 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '상승/하락 토큰 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 내 가격 알림 목록 조회
   * GET /api/price/alerts/my
   */
  async getMyPriceAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
        return;
      }

      const alerts = await this.priceService.getUserPriceAlerts(userId);

      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      console.error('가격 알림 목록 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '가격 알림 목록 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 가격 알림 생성
   * POST /api/price/alerts
   */
  async createPriceAlert(req: AlertRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { tokenSymbol, targetPrice, condition, isActive = true } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
        return;
      }

      if (!tokenSymbol || !targetPrice || !condition) {
        res.status(400).json({
          success: false,
          message: '토큰 심볼, 목표 가격, 조건이 필요합니다.'
        });
        return;
      }

      const alert = await this.priceService.createPriceAlert(
        userId,
        tokenSymbol,
        targetPrice,
        condition,
        isActive
      );

      res.status(201).json({
        success: true,
        data: alert,
        message: '가격 알림이 생성되었습니다.'
      });
    } catch (error) {
      console.error('가격 알림 생성 오류:', error);
      res.status(500).json({
        success: false,
        message: '가격 알림 생성 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 가격 알림 수정
   * PUT /api/price/alerts/:alertId
   */
  async updatePriceAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { alertId } = req.params;
      const updateData = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
        return;
      }

      const updatedAlert = await this.priceService.updatePriceAlert(
        alertId,
        userId,
        updateData
      );

      res.json({
        success: true,
        data: updatedAlert,
        message: '가격 알림이 수정되었습니다.'
      });
    } catch (error) {
      console.error('가격 알림 수정 오류:', error);
      res.status(500).json({
        success: false,
        message: '가격 알림 수정 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 가격 알림 삭제
   * DELETE /api/price/alerts/:alertId
   */
  async deletePriceAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { alertId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
        return;
      }

      await this.priceService.deletePriceAlert(alertId, userId);

      res.json({
        success: true,
        message: '가격 알림이 삭제되었습니다.'
      });
    } catch (error) {
      console.error('가격 알림 삭제 오류:', error);
      res.status(500).json({
        success: false,
        message: '가격 알림 삭제 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 가격 캐시 새로고침
   * POST /api/price/admin/refresh-cache
   */
  async refreshPriceCache(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다.'
        });
        return;
      }

      await this.priceService.refreshCache();

      res.json({
        success: true,
        message: '가격 캐시가 새로고침되었습니다.'
      });
    } catch (error) {
      console.error('가격 캐시 새로고침 오류:', error);
      res.status(500).json({
        success: false,
        message: '가격 캐시 새로고침 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * API 상태 조회
   * GET /api/price/admin/status
   */
  async getApiStatus(_req: Request, res: Response): Promise<void> {
    try {
      const status = await this.priceService.getApiStatus();

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('API 상태 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: 'API 상태 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 가격 제공자 변경
   * POST /api/price/admin/switch-provider
   */
  async switchPriceProvider(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다.'
        });
        return;
      }

      const { provider } = req.body;

      if (!provider) {
        res.status(400).json({
          success: false,
          message: '가격 제공자가 필요합니다.'
        });
        return;
      }

      await this.priceService.switchProvider(provider);

      res.json({
        success: true,
        message: `가격 제공자가 ${provider}로 변경되었습니다.`
      });
    } catch (error) {
      console.error('가격 제공자 변경 오류:', error);
      res.status(500).json({
        success: false,
        message: '가격 제공자 변경 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 가격 서비스 통계 조회
   * GET /api/price/admin/stats
   */
  async getPriceServiceStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.priceService.getServiceStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('가격 서비스 통계 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '가격 서비스 통계 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * WebSocket 구독 정보 조회
   * GET /api/price/websocket
   */
  async getWebSocketSubscription(_req: Request, res: Response): Promise<void> {
    try {
      const subscriptionInfo = await this.priceService.getWebSocketInfo();

      res.json({
        success: true,
        data: subscriptionInfo
      });
    } catch (error) {
      console.error('WebSocket 구독 정보 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: 'WebSocket 구독 정보 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 테스트용 가격 설정
   * POST /api/price/dev/mock
   */
  async setMockPrice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다.'
        });
        return;
      }

      const { tokenSymbol, price } = req.body;

      if (!tokenSymbol || !price) {
        res.status(400).json({
          success: false,
          message: '토큰 심볼과 가격이 필요합니다.'
        });
        return;
      }

      await this.priceService.setMockPrice(tokenSymbol, price);

      res.json({
        success: true,
        message: `${tokenSymbol}의 테스트 가격이 ${price}로 설정되었습니다.`
      });
    } catch (error) {
      console.error('테스트 가격 설정 오류:', error);
      res.status(500).json({
        success: false,
        message: '테스트 가격 설정 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 변동성 시뮬레이션
   * POST /api/price/dev/simulate-volatility
   */
  async simulateVolatility(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: '관리자 권한이 필요합니다.'
        });
        return;
      }

      const { tokenSymbol, volatilityPercent, duration } = req.body;

      if (!tokenSymbol || !volatilityPercent || !duration) {
        res.status(400).json({
          success: false,
          message: '토큰 심볼, 변동성 퍼센트, 지속 시간이 필요합니다.'
        });
        return;
      }

      const result = await this.priceService.simulateVolatility(
        tokenSymbol,
        volatilityPercent,
        duration
      );

      res.json({
        success: true,
        data: result,
        message: '변동성 시뮬레이션이 시작되었습니다.'
      });
    } catch (error) {
      console.error('변동성 시뮬레이션 오류:', error);
      res.status(500).json({
        success: false,
        message: '변동성 시뮬레이션 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 캐시 상태 조회
   * GET /api/price/dev/cache-status
   */
  async getCacheStatus(_req: Request, res: Response): Promise<void> {
    try {
      const cacheStatus = await this.priceService.getCacheStatus();

      res.json({
        success: true,
        data: cacheStatus
      });
    } catch (error) {
      console.error('캐시 상태 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '캐시 상태 조회 중 오류가 발생했습니다.'
      });
    }
  }
}

export default PriceController;