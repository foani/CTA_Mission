import axios, { type AxiosResponse } from 'axios';

// 환경 변수 타입 안전성 확보
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * 지원되는 암호화폐 심볼 (프론트엔드용)
 */
export type SupportedSymbol = 'BTC' | 'ETH' | 'CTA';

/**
 * 가격 데이터 인터페이스
 */
export interface PriceData {
  symbol: SupportedSymbol;
  price: number;
  change24h: number;
  changePercent24h: number;
  lastUpdated: string;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap?: number;
  tokenId: string; // 백엔드 토큰 ID
}

/**
 * 차트 데이터 포인트
 */
export interface ChartDataPoint {
  timestamp: number;
  price: number;
  volume?: number;
}

/**
 * 차트 데이터 응답
 */
export interface ChartData {
  symbol: SupportedSymbol;
  timeframe: '1h' | '1d' | '7d' | '30d';
  data: ChartDataPoint[];
}

/**
 * 백엔드 표준 응답 구조
 */
interface StandardApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

/**
 * 백엔드 가격 데이터 구조
 */
interface BackendPriceData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  total_volume: number;
  market_cap?: number;
  last_updated: string;
}

/**
 * 백엔드 차트 데이터 구조
 */
interface BackendChartData {
  prices: [number, number][]; // [timestamp, price]
  market_caps?: [number, number][];
  total_volumes?: [number, number][];
}

/**
 * 실시간 가격 서비스 클래스
 */
export class PriceService {
  private static instance: PriceService;
  private priceCache = new Map<SupportedSymbol, PriceData>();
  private chartCache = new Map<string, ChartData>();
  private subscriptions = new Map<string, Set<(data: PriceData) => void>>();
  private pollInterval: number | null = null;
  private readonly CACHE_DURATION = 30000; // 30초
  private readonly POLL_INTERVAL = 10000; // 10초
  private isPolling = false;

  /**
   * 토큰 심볼을 백엔드 토큰 ID로 매핑
   */
  private readonly symbolToTokenIdMap: Record<SupportedSymbol, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'CTA': 'creatachain' // CTA 토큰의 실제 백엔드 ID로 변경 필요
  };

  /**
   * 타임프레임을 백엔드 days 파라미터로 매핑
   */
  private readonly timeframeToDaysMap: Record<string, string> = {
    '1h': '1',
    '1d': '1',
    '7d': '7',
    '30d': '30'
  };

  /**
   * 타임프레임을 백엔드 interval 파라미터로 매핑
   */
  private readonly timeframeToIntervalMap: Record<string, string> = {
    '1h': 'minutely',
    '1d': 'hourly',
    '7d': 'daily',
    '30d': 'daily'
  };

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): PriceService {
    if (!PriceService.instance) {
      PriceService.instance = new PriceService();
    }
    return PriceService.instance;
  }

  private constructor() {
    // 브라우저 환경에서만 폴링 시작
    if (typeof window !== 'undefined') {
      this.startPolling();
    }
  }

  /**
   * 단일 가격 조회
   */
  public async getPrice(symbol: SupportedSymbol): Promise<PriceData> {
    try {
      // 캐시에서 먼저 확인
      const cached = this.priceCache.get(symbol);
      if (cached && this.isCacheValid(cached.lastUpdated)) {
        return cached;
      }

      const tokenId = this.symbolToTokenIdMap[symbol];
      const response: AxiosResponse<StandardApiResponse<BackendPriceData>> = await axios.get(
        `${API_BASE_URL}/api/price/${tokenId}`,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
          params: {
            vs_currency: 'usd',
            include_24hr_change: 'true',
            include_market_cap: 'true'
          }
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(`API Error: ${response.data.error || 'Failed to fetch price data'}`);
      }

      const backendData = response.data.data;
      const priceData = this.transformBackendPriceData(backendData, symbol);
      
      this.priceCache.set(symbol, priceData);
      
      // 구독자들에게 알림
      this.notifySubscribers(symbol, priceData);
      
      return priceData;
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error);
      
      // 캐시된 데이터라도 반환
      const cached = this.priceCache.get(symbol);
      if (cached) {
        return cached;
      }
      
      // 기본값 반환
      return this.getDefaultPriceData(symbol);
    }
  }

  /**
   * 여러 가격 조회 (current 엔드포인트 사용)
   */
  public async getMultiplePrices(symbols: SupportedSymbol[]): Promise<Map<SupportedSymbol, PriceData>> {
    const results = new Map<SupportedSymbol, PriceData>();
    
    try {
      const tokenIds = symbols.map(symbol => this.symbolToTokenIdMap[symbol]);
      
      const response: AxiosResponse<StandardApiResponse<BackendPriceData[]>> = await axios.get(
        `${API_BASE_URL}/api/price/current`,
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
          },
          params: {
            tokens: tokenIds.join(','),
            vs_currency: 'usd',
            include_24hr_change: 'true',
            include_market_cap: 'true'
          }
        }
      );

      if (response.data.success && response.data.data) {
        const backendDataArray = Array.isArray(response.data.data) 
          ? response.data.data 
          : [response.data.data];
          
        backendDataArray.forEach((backendData) => {
          const symbol = this.getSymbolFromTokenId(backendData.id);
          if (symbol) {
            const priceData = this.transformBackendPriceData(backendData, symbol);
            results.set(symbol, priceData);
            this.priceCache.set(symbol, priceData);
            this.notifySubscribers(symbol, priceData);
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch multiple prices:', error);
    }
    
    // 실패한 심볼들은 개별 호출로 처리
    for (const symbol of symbols) {
      if (!results.has(symbol)) {
        try {
          const priceData = await this.getPrice(symbol);
          results.set(symbol, priceData);
        } catch (error) {
          console.error(`Failed to fetch price for ${symbol}:`, error);
          results.set(symbol, this.getDefaultPriceData(symbol));
        }
      }
    }

    return results;
  }

  /**
   * 차트 데이터 조회
   */
  public async getChartData(
    symbol: SupportedSymbol,
    timeframe: '1h' | '1d' | '7d' | '30d' = '1d'
  ): Promise<ChartData> {
    try {
      const cacheKey = `${symbol}_${timeframe}`;
      const cached = this.chartCache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const tokenId = this.symbolToTokenIdMap[symbol];
      const days = this.timeframeToDaysMap[timeframe];
      const interval = this.timeframeToIntervalMap[timeframe];

      const response: AxiosResponse<StandardApiResponse<BackendChartData>> = await axios.get(
        `${API_BASE_URL}/api/price/${tokenId}/chart`,
        {
          timeout: 20000,
          headers: {
            'Content-Type': 'application/json',
          },
          params: {
            vs_currency: 'usd',
            days,
            interval
          }
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(`Chart API Error: ${response.data.error || 'Failed to fetch chart data'}`);
      }

      const chartData = this.transformBackendChartData(response.data.data, symbol, timeframe);
      this.chartCache.set(cacheKey, chartData);
      
      return chartData;
    } catch (error) {
      console.error(`Failed to fetch chart data for ${symbol}:`, error);
      
      // 기본 차트 데이터 반환
      return this.getDefaultChartData(symbol, timeframe);
    }
  }

  /**
   * 가격 구독
   */
  public subscribe(symbol: SupportedSymbol, callback: (data: PriceData) => void): () => void {
    const subscriptionKey = symbol;
    
    if (!this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.set(subscriptionKey, new Set());
    }
    
    this.subscriptions.get(subscriptionKey)!.add(callback);
    
    // 즉시 현재 가격 전송
    const cached = this.priceCache.get(symbol);
    if (cached) {
      callback(cached);
    } else {
      this.getPrice(symbol).then(callback).catch(console.error);
    }
    
    // 구독 해제 함수 반환
    return () => {
      const subs = this.subscriptions.get(subscriptionKey);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscriptions.delete(subscriptionKey);
        }
      }
    };
  }

  /**
   * 백엔드 가격 데이터를 프론트엔드 형식으로 변환
   */
  private transformBackendPriceData(backendData: BackendPriceData, symbol: SupportedSymbol): PriceData {
    return {
      symbol,
      price: backendData.current_price || 0,
      change24h: backendData.price_change_24h || 0,
      changePercent24h: backendData.price_change_percentage_24h || 0,
      lastUpdated: backendData.last_updated || new Date().toISOString(),
      high24h: backendData.high_24h || 0,
      low24h: backendData.low_24h || 0,
      volume24h: backendData.total_volume || 0,
      marketCap: backendData.market_cap,
      tokenId: backendData.id
    };
  }

  /**
   * 백엔드 차트 데이터를 프론트엔드 형식으로 변환
   */
  private transformBackendChartData(
    backendData: BackendChartData, 
    symbol: SupportedSymbol, 
    timeframe: string
  ): ChartData {
    const data: ChartDataPoint[] = backendData.prices.map(([timestamp, price], index) => ({
      timestamp,
      price,
      volume: backendData.total_volumes?.[index]?.[1]
    }));

    return {
      symbol,
      timeframe: timeframe as '1h' | '1d' | '7d' | '30d',
      data
    };
  }

  /**
   * 토큰 ID에서 심볼 찾기
   */
  private getSymbolFromTokenId(tokenId: string): SupportedSymbol | null {
    for (const [symbol, id] of Object.entries(this.symbolToTokenIdMap)) {
      if (id === tokenId) {
        return symbol as SupportedSymbol;
      }
    }
    return null;
  }

  /**
   * 폴링 시작
   */
  private startPolling(): void {
    if (this.isPolling || typeof window === 'undefined') {
      return;
    }

    this.isPolling = true;
    this.pollInterval = window.setInterval(async () => {
      try {
        // 구독된 심볼들만 업데이트
        const symbolsToUpdate = Array.from(this.subscriptions.keys()) as SupportedSymbol[];
        
        if (symbolsToUpdate.length > 0) {
          await this.getMultiplePrices(symbolsToUpdate);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, this.POLL_INTERVAL);
  }

  /**
   * 폴링 중지
   */
  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      this.isPolling = false;
    }
  }

  /**
   * 구독자들에게 알림
   */
  private notifySubscribers(symbol: SupportedSymbol, data: PriceData): void {
    const subscribers = this.subscriptions.get(symbol);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Subscriber callback error:', error);
        }
      });
    }
  }

  /**
   * 캐시 유효성 검사
   */
  private isCacheValid(lastUpdated: string): boolean {
    const now = Date.now();
    const cacheTime = new Date(lastUpdated).getTime();
    return (now - cacheTime) < this.CACHE_DURATION;
  }

  /**
   * 기본 가격 데이터 생성
   */
  private getDefaultPriceData(symbol: SupportedSymbol): PriceData {
    const basePrice = symbol === 'BTC' ? 50000 : symbol === 'ETH' ? 3000 : 1;
    
    return {
      symbol,
      price: basePrice,
      change24h: 0,
      changePercent24h: 0,
      lastUpdated: new Date().toISOString(),
      high24h: basePrice * 1.05,
      low24h: basePrice * 0.95,
      volume24h: 1000000,
      tokenId: this.symbolToTokenIdMap[symbol]
    };
  }

  /**
   * 기본 차트 데이터 생성
   */
  private getDefaultChartData(symbol: SupportedSymbol, timeframe: string): ChartData {
    const now = Date.now();
    const basePrice = symbol === 'BTC' ? 50000 : symbol === 'ETH' ? 3000 : 1;
    const points = timeframe === '1h' ? 60 : timeframe === '1d' ? 24 : timeframe === '7d' ? 7 : 30;
    const intervalMs = timeframe === '1h' ? 60000 : timeframe === '1d' ? 3600000 : 86400000;
    
    const data: ChartDataPoint[] = Array.from({ length: points }, (_, i) => ({
      timestamp: now - (points - i - 1) * intervalMs,
      price: basePrice + (Math.random() - 0.5) * basePrice * 0.1,
      volume: Math.random() * 1000000,
    }));

    return {
      symbol,
      timeframe: timeframe as '1h' | '1d' | '7d' | '30d',
      data,
    };
  }

  /**
   * 서비스 정리
   */
  public destroy(): void {
    this.stopPolling();
    this.subscriptions.clear();
    this.priceCache.clear();
    this.chartCache.clear();
  }
}

// 싱글톤 인스턴스 export
export const priceService = PriceService.getInstance();

// 브라우저에서 페이지 언로드 시 정리
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    priceService.destroy();
  });
}