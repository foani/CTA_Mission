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

export class PriceController {
  private priceService: PriceService;

  constructor() {
    this.priceService = new PriceService();
  }

  async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      const status = await this.priceService.healthCheck();
      res.json({ success: true, status: status ? 'healthy' : 'degraded', data: { timestamp: new Date().toISOString(), priceService: status ? 'healthy' : 'degraded', supportedTokens: await this.priceService.getSupportedTokens() } });
    } catch (error) {
      console.error('Price health check 오류:', error);
      res.status(500).json({ success: false, status: 'unhealthy', message: '가격 서비스 상태 확인 중 오류가 발생했습니다.' });
    }
  }

  async getCurrentPrice(req: PriceQuery, res: Response): Promise<void> {
    try {
      const { tokens, vs_currency = 'usd', include_24hr_change = 'true', include_market_cap = 'false' } = req.query;
      if (!tokens) {
        res.status(400).json({ success: false, message: '토큰 목록이 필요합니다. (예: ?tokens=bitcoin,ethereum,cardano)' });
        return;
      }
      const tokenList = tokens.split(',').map(token => token.trim().toLowerCase());
      const priceData = await this.priceService.getMultiplePrices(tokenList, vs_currency, include_24hr_change === 'true', include_market_cap === 'true');
      res.json({ success: true, data: priceData, message: '현재 가격 조회 성공' });
    } catch (error) {
      console.error('현재 가격 조회 오류:', error);
      res.status(500).json({ success: false, message: '현재 가격 조회 중 오류가 발생했습니다.' });
    }
  }

  async getSupportedTokens(_req: Request, res: Response): Promise<void> {
    try {
      const tokens = await this.priceService.getSupportedTokens();
      res.json({ success: true, data: { tokens, count: tokens.length, lastUpdated: new Date().toISOString() } });
    } catch (error) {
      console.error('지원 토큰 조회 오류:', error);
      res.status(500).json({ success: false, message: '지원 토큰 조회 중 오류가 발생했습니다.' });
    }
  }

  async getTokenPrice(req: Request, res: Response): Promise<void> {
    try {
      const { tokenSymbol } = req.params;
            const { vs_currency: _vs_currency = 'usd', include_24hr_change: _include_24hr_change = 'true', include_market_cap: _include_market_cap = 'true' } = req.query;
      if (!tokenSymbol) {
        res.status(400).json({ success: false, message: '토큰 심볼이 필요합니다.' });
        return;
      }
      const priceData = await this.priceService.getCurrentPriceBySymbol(tokenSymbol.toLowerCase());
      if (!priceData) {
        res.status(404).json({ success: false, message: '해당 토큰의 가격 정보를 찾을 수 없습니다.' });
        return;
      }
      res.json({ success: true, data: priceData });
    } catch (error) {
      console.error('토큰 가격 조회 오류:', error);
      res.status(500).json({ success: false, message: '토큰 가격 조회 중 오류가 발생했습니다.' });
    }
  }

  async getChartData(req: ChartQuery, res: Response): Promise<void> {
    try {
      const { tokenSymbol } = req.params;
      const { vs_currency: _vs_currency = 'usd', days = '7', interval = 'daily' } = req.query;
      if (!tokenSymbol) {
        res.status(400).json({ success: false, message: '토큰 심볼이 필요합니다.' });
        return;
      }
            const chartData = await this.priceService.getChartData(tokenSymbol.toLowerCase(), 'usd', parseInt(days as string), interval as string);
      res.json({ success: true, data: chartData });
    } catch (error) {
      console.error('차트 데이터 조회 오류:', error);
      res.status(500).json({ success: false, message: '차트 데이터 조회 중 오류가 발생했습니다.' });
    }
  }

  async getPriceHistory(req: HistoryQuery, res: Response): Promise<void> {
    try {
      const { tokenSymbol } = req.params;
            const { days = '1', interval: _interval = '1h', vs_currency: _vs_currency = 'usd' } = req.query;
      if (!tokenSymbol) {
        res.status(400).json({ success: false, message: '토큰 심볼이 필요합니다.' });
        return;
      }
            const historyData = await this.priceService.getPriceHistory(tokenSymbol.toLowerCase(), days as string, 'usd');
      res.json({ success: true, data: historyData });
    } catch (error) {
      console.error('가격 히스토리 조회 오류:', error);
      res.status(500).json({ success: false, message: '가격 히스토리 조회 중 오류가 발생했습니다.' });
    }
  }
  
  /**
   * 시장 개요 조회
   * GET /api/price/market-overview
   */
  async getMarketOverview(_req: Request, res: Response): Promise<void> {
      try {
        const marketData = await this.priceService.getMarketOverview();
        res.json({ success: true, data: marketData });
      } catch (error) {
        console.error('시장 개요 조회 오류:', error);
        res.status(500).json({ success: false, message: '시장 개요 조회 중 오류가 발생했습니다.' });
      }
    }
  
    async getTrendingTokens(req: Request, res: Response): Promise<void> {
      try {
        const { limit = '10' } = req.query;
        const trendingData = await this.priceService.getTrendingTokens(parseInt(limit as string));
        res.json({ success: true, data: trendingData });
      } catch (error) {
        console.error('트렌딩 토큰 조회 오류:', error);
        res.status(500).json({ success: false, message: '트렌딩 토큰 조회 중 오류가 발생했습니다.' });
      }
    }
  
    async getGainersLosers(req: Request, res: Response): Promise<void> {
      try {
        const { type = 'both', limit = '10' } = req.query;
        const data = await this.priceService.getGainersLosers(type as string, parseInt(limit as string));
        res.json({ success: true, data });
      } catch (error) {
        console.error('상승/하락 토큰 조회 오류:', error);
        res.status(500).json({ success: false, message: '상승/하락 토큰 조회 중 오류가 발생했습니다.' });
      }
    }
  
    async getMyPriceAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
      try {
        const userId = req.user?.id;
        if (!userId) {
          res.status(401).json({ success: false, message: '인증이 필요합니다.' });
          return;
        }
        const alerts = await this.priceService.getUserPriceAlerts(userId);
        res.json({ success: true, data: alerts });
      } catch (error) {
        console.error('가격 알림 목록 조회 오류:', error);
        res.status(500).json({ success: false, message: '가격 알림 목록 조회 중 오류가 발생했습니다.' });
      }
    }
  
    async createPriceAlert(req: AlertRequest, res: Response): Promise<void> {
      try {
        const userId = req.user?.id;
        const { tokenSymbol, targetPrice, condition, isActive = true } = req.body;
        if (!userId) {
          res.status(401).json({ success: false, message: '인증이 필요합니다.' });
          return;
        }
        if (!tokenSymbol || !targetPrice || !condition) {
          res.status(400).json({ success: false, message: '토큰 심볼, 목표 가격, 조건이 필요합니다.' });
          return;
        }
        const alert = await this.priceService.createPriceAlert(userId, tokenSymbol, targetPrice, condition, isActive);
        res.status(201).json({ success: true, data: alert, message: '가격 알림이 생성되었습니다.' });
      } catch (error) {
        console.error('가격 알림 생성 오류:', error);
        res.status(500).json({ success: false, message: '가격 알림 생성 중 오류가 발생했습니다.' });
      }
    }
  
    async updatePriceAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
      try {
        const userId = req.user?.id;
        const { alertId } = req.params;
        const updateData = req.body;
        if (!userId) {
          res.status(401).json({ success: false, message: '인증이 필요합니다.' });
          return;
        }
        const updatedAlert = await this.priceService.updatePriceAlert(alertId, userId, updateData);
        res.json({ success: true, data: updatedAlert, message: '가격 알림이 수정되었습니다.' });
      } catch (error) {
        console.error('가격 알림 수정 오류:', error);
        res.status(500).json({ success: false, message: '가격 알림 수정 중 오류가 발생했습니다.' });
      }
    }

}

export default PriceController;