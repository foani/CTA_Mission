import axios, { AxiosInstance } from 'axios';
import NodeCache from 'node-cache';

/**
 * 토큰 가격 정보 인터페이스
 */
export interface TokenPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi: any;
  last_updated: string;
}

/**
 * 실시간 크립토 가격 데이터 서비스
 */
export class PriceService {
  private coinGeckoApi: AxiosInstance;
  private cache: NodeCache;
  private currentProvider: 'coingecko' | 'binance';
  private apiCallCount: number;
  private lastApiCall: number;

  // 지원하는 토큰들과 CoinGecko ID 매핑
  private supportedTokens: Record<string, string> = {
    'bitcoin': 'bitcoin',
    'ethereum': 'ethereum',
    'cta': 'catena', // Catena 네트워크 토큰
    'btc': 'bitcoin',
    'eth': 'ethereum'
  };

  constructor() {
    // CoinGecko API 설정
    this.coinGeckoApi = axios.create({
      baseURL: process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3',
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'X-CG-Demo-API-Key': process.env.COINGECKO_API_KEY || ''
        }
        });
        
        // 캐시 설정
        this.cache = new NodeCache({
        stdTTL: parseInt(process.env.PRICE_CACHE_DURATION || '5'),
        checkperiod: 2,
        useClones: false
        });
        
        // 기본 제공자 설정
        this.currentProvider = 'coingecko';
        this.apiCallCount = 0;
        this.lastApiCall = 0;
  }

  /**
   * 서비스 상태 확인
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const response = await this.coinGeckoApi.get('/ping', { timeout: 5000 });
      return response.status === 200 && response.data?.gecko_says === 'Hello World!';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * 여러 토큰의 가격을 한 번에 조회
   */
  public async getMultiplePrices(
    tokens: string[],
    vsCurrency: string = 'usd',
    include24hrChange: boolean = true,
    includeMarketCap: boolean = false
  ): Promise<TokenPrice[]> {
    const cacheKey = `multiple_prices_${tokens.join('_')}_${vsCurrency}`;
    
    const cached = this.cache.get<TokenPrice[]>(cacheKey);
    if (cached) return cached;

    try {
      const tokenIds = tokens.map(token => this.getTokenIdBySymbol(token) || token).join(',');
      
      const response = await this.coinGeckoApi.get('/simple/price', {
        params: {
          ids: tokenIds,
          vs_currencies: vsCurrency,
          include_market_cap: includeMarketCap,
          include_24hr_change: include24hrChange,
          include_24hr_vol: true,
          include_last_updated_at: true
        }
      });

      const results: TokenPrice[] = [];
      for (const [tokenId, data] of Object.entries(response.data)) {
        const symbol = this.getSymbolByTokenId(tokenId);
        if (data && typeof data === 'object') {
          const tokenData = data as any;
          results.push({
            id: tokenId,
            symbol: symbol || tokenId.toUpperCase(),
            name: tokenId.charAt(0).toUpperCase() + tokenId.slice(1),
            current_price: tokenData[vsCurrency] || 0,
            market_cap: tokenData[`${vsCurrency}_market_cap`] || 0,
            market_cap_rank: 0,
            fully_diluted_valuation: 0,
            total_volume: tokenData[`${vsCurrency}_24h_vol`] || 0,
            high_24h: 0,
            low_24h: 0,
            price_change_24h: 0,
            price_change_percentage_24h: tokenData.price_change_percentage_24h || 0,
            market_cap_change_24h: 0,
            market_cap_change_percentage_24h: 0,
            circulating_supply: 0,
            total_supply: 0,
            max_supply: 0,
            ath: 0,
            ath_change_percentage: 0,
            ath_date: '',
            atl: 0,
            atl_change_percentage: 0,
            atl_date: '',
            roi: null,
            last_updated: tokenData.last_updated_at ? new Date(tokenData.last_updated_at * 1000).toISOString() : new Date().toISOString()
          });
        }
      }

      this.cache.set(cacheKey, results);
      return results;
    } catch (error) {
      console.error('Multiple prices fetch error:', error);
      throw new Error('여러 토큰 가격 조회 실패');
    }
  }

  /**
   * 지원하는 토큰 목록 반환
   */
  public async getSupportedTokens(): Promise<string[]> {
    return Object.keys(this.supportedTokens);
  }

  /**
   * 상승/하락 토큰 조회
   */
  public async getGainersLosers(type: string = 'both', limit: number = 10): Promise<any> {
    const cacheKey = `gainers_losers_${type}_${limit}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.coinGeckoApi.get('/coins/markets', {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: Math.min(limit * 2, 100),
          page: 1,
          sparkline: false,
          price_change_percentage: '24h'
        }
      });

      const data = response.data || [];
      
      const sorted = data.sort((a: any, b: any) => 
        (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)
      );

      let result: any = {};
      
      if (type === 'gainers' || type === 'both') {
        result.gainers = sorted
          .filter((token: any) => (token.price_change_percentage_24h || 0) > 0)
          .slice(0, limit);
      }
      
      if (type === 'losers' || type === 'both') {
        result.losers = sorted
          .filter((token: any) => (token.price_change_percentage_24h || 0) < 0)
          .reverse()
          .slice(0, limit);
      }

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Gainers/Losers fetch error:', error);
      throw new Error('상승/하락 토큰 조회 실패');
    }
  }

  /**
   * 현재 가격 조회
   */
  public async getCurrentPrice(
    tokens: string[] = ['bitcoin', 'ethereum'],
    vsCurrency: string = 'usd',
    include24hrChange: boolean = true,
    includeMarketCap: boolean = false
  ): Promise<TokenPrice[]> {
    return this.getMultiplePrices(tokens, vsCurrency, include24hrChange, includeMarketCap);
  }

  /**
   * 토큰 가격 조회
   */
  public async getTokenPrice(tokenId: string, vsCurrency: string = 'usd'): Promise<TokenPrice> {
    const cacheKey = `token_price_${tokenId}_${vsCurrency}`;
    
    const cached = this.cache.get<TokenPrice>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.coinGeckoApi.get(`/coins/${tokenId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false
        }
      });

      const data = response.data;
      const marketData = data.market_data;

      const tokenPrice: TokenPrice = {
        id: data.id,
        symbol: data.symbol?.toUpperCase() || '',
        name: data.name || '',
        current_price: marketData?.current_price?.[vsCurrency] || 0,
        market_cap: marketData?.market_cap?.[vsCurrency] || 0,
        market_cap_rank: marketData?.market_cap_rank || 0,
        fully_diluted_valuation: marketData?.fully_diluted_valuation?.[vsCurrency] || 0,
        total_volume: marketData?.total_volume?.[vsCurrency] || 0,
        high_24h: marketData?.high_24h?.[vsCurrency] || 0,
        low_24h: marketData?.low_24h?.[vsCurrency] || 0,
        price_change_24h: marketData?.price_change_24h || 0,
        price_change_percentage_24h: marketData?.price_change_percentage_24h || 0,
        market_cap_change_24h: marketData?.market_cap_change_24h || 0,
        market_cap_change_percentage_24h: marketData?.market_cap_change_percentage_24h || 0,
        circulating_supply: marketData?.circulating_supply || 0,
        total_supply: marketData?.total_supply || 0,
        max_supply: marketData?.max_supply || 0,
        ath: marketData?.ath?.[vsCurrency] || 0,
        ath_change_percentage: marketData?.ath_change_percentage?.[vsCurrency] || 0,
        ath_date: marketData?.ath_date?.[vsCurrency] || '',
        atl: marketData?.atl?.[vsCurrency] || 0,
        atl_change_percentage: marketData?.atl_change_percentage?.[vsCurrency] || 0,
        atl_date: marketData?.atl_date?.[vsCurrency] || '',
        roi: data.roi || null,
        last_updated: data.last_updated || new Date().toISOString()
      };

      this.cache.set(cacheKey, tokenPrice);
      return tokenPrice;
    } catch (error) {
      console.error('Token price fetch error:', error);
      throw new Error('토큰 가격 조회 실패');
    }
  }

  /**
   * 심볼로 현재 가격 조회
   */
  public async getCurrentPriceBySymbol(tokenSymbol: string): Promise<any> {
    try {
      const tokenId = this.getTokenIdBySymbol(tokenSymbol);
      if (!tokenId) return null;

      const priceData = await this.getTokenPrice(tokenId);
      return {
        symbol: tokenSymbol.toUpperCase(),
        price: priceData.current_price,
        change24h: priceData.price_change_percentage_24h,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Current price by symbol error:', error);
      return null;
    }
  }

  /**
   * 차트 데이터 조회
   */
  public async getChartData(
    tokenId: string,
    vsCurrency: string = 'usd',
    days: number = 7,
    interval?: string
  ): Promise<any[]> {
    const cacheKey = `chart_${tokenId}_${vsCurrency}_${days}_${interval}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached && Array.isArray(cached)) return cached;

    try {
      const response = await this.coinGeckoApi.get(`/coins/${tokenId}/market_chart`, {
        params: {
          vs_currency: vsCurrency,
          days: days,
          interval: interval || 'daily'
        }
      });

      const chartData = response.data.prices?.map((price: any[]) => ({
        timestamp: price[0],
        price: price[1],
        date: new Date(price[0]).toISOString()
      })) || [];

      this.cache.set(cacheKey, chartData);
      return chartData;
    } catch (error) {
      console.error('Chart data fetch error:', error);
      return [];
    }
  }

  /**
   * 가격 히스토리 조회
   */
  public async getPriceHistory(
    tokenId: string,
    date: string,
    vsCurrency: string = 'usd'
  ): Promise<any> {
    try {
      const response = await this.coinGeckoApi.get(`/coins/${tokenId}/history`, {
        params: {
          date: date,
          localization: false
        }
      });

      return {
        id: response.data.id,
        symbol: response.data.symbol,
        name: response.data.name,
        date: date,
        current_price: response.data.market_data?.current_price?.[vsCurrency] || 0,
        market_cap: response.data.market_data?.market_cap?.[vsCurrency] || 0
      };
    } catch (error) {
      console.error('Price history fetch error:', error);
      throw new Error('가격 히스토리 조회 실패');
    }
  }

  /**
   * 마켓 개요 조회
   */
  public async getMarketOverview(vsCurrency: string = 'usd'): Promise<any> {
    const cacheKey = `market_overview_${vsCurrency}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.coinGeckoApi.get('/global');
      const data = response.data.data;

      const marketData = {
        total_market_cap: data.total_market_cap?.[vsCurrency] || 0,
        total_volume: data.total_volume?.[vsCurrency] || 0,
        market_cap_percentage: data.market_cap_percentage || {},
        market_cap_change_percentage_24h: data.market_cap_change_percentage_24h_usd || 0
      };

      this.cache.set(cacheKey, marketData);
      return marketData;
    } catch (error) {
      console.error('Market overview fetch error:', error);
      throw new Error('마켓 개요 조회 실패');
    }
  }

  /**
   * 트렌딩 토큰 조회
   */
  public async getTrendingTokens(limit: number = 10): Promise<any[]> {
    const cacheKey = `trending_${limit}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached && Array.isArray(cached)) return cached;

    try {
      const response = await this.coinGeckoApi.get('/search/trending');
      const trending = response.data.coins?.slice(0, limit) || [];

      this.cache.set(cacheKey, trending);
      return trending;
    } catch (error) {
      console.error('Trending tokens fetch error:', error);
      return [];
    }
  }

  /**
   * 캐시 새로고침
   */
  public async refreshCache(tokens?: string[]): Promise<void> {
    try {
      if (tokens && tokens.length > 0) {
        tokens.forEach(token => {
          const keys = this.cache.keys();
          keys.forEach(key => {
            if (key.includes(token.toLowerCase())) {
              this.cache.del(key);
            }
          });
        });
      } else {
        this.cache.flushAll();
      }
      console.log('Cache refreshed successfully');
    } catch (error) {
      console.error('Cache refresh failed:', error);
      throw new Error('캐시 새로고침 실패');
    }
  }

  // 추가 메서드들...
  public async getUserPriceAlerts(userId: string): Promise<any[]> {
    console.log(`Getting price alerts for user: ${userId}`);
    return [];
  }

  public async createPriceAlert(
    userId: string,
    tokenSymbol: string,
    targetPrice: number,
    condition: string,
    isActive: boolean = true
  ): Promise<any> {
    const alert = {
      id: `alert_${Date.now()}`,
      userId,
      tokenSymbol,
      targetPrice,
      condition,
      isActive,
      createdAt: new Date().toISOString()
    };
    console.log(`Created price alert:`, alert);
    return alert;
  }

  public async updatePriceAlert(
    alertId: string,
    userId: string,
    updateData: any
  ): Promise<any> {
    console.log(`Updated price alert ${alertId} for user ${userId}:`, updateData);
    return { id: alertId, ...updateData, updatedAt: new Date().toISOString() };
  }

  public async deletePriceAlert(alertId: string, userId: string): Promise<void> {
    console.log(`Deleted price alert ${alertId} for user ${userId}`);
  }

  public async getApiStatus(): Promise<any> {
    try {
      const health = await this.healthCheck();
      return {
        status: health ? 'healthy' : 'degraded',
        currentProvider: this.currentProvider,
        apiCallCount: this.apiCallCount,
        lastApiCall: this.lastApiCall,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  public async switchProvider(provider: 'coingecko' | 'binance'): Promise<void> {
    this.currentProvider = provider;
    console.log(`Switched to provider: ${provider}`);
    this.cache.flushAll();
  }

  public async getServiceStats(): Promise<any> {
    const cacheStats = this.cache.getStats();
    
    return {
      apiCalls: this.apiCallCount,
      cache: {
        keys: cacheStats.keys,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0
      },
      currentProvider: this.currentProvider,
      uptime: process.uptime(),
      supportedTokens: Object.keys(this.supportedTokens).length,
      timestamp: new Date().toISOString()
    };
  }

  public async getWebSocketInfo(): Promise<any> {
    return {
      endpoint: 'wss://api.example.com/ws',
      protocols: ['price-stream'],
      supportedSymbols: Object.values(this.supportedTokens),
      status: 'available',
      timestamp: new Date().toISOString()
    };
  }

  public async setMockPrice(tokenSymbol: string, price: number): Promise<void> {
    const cacheKey = `mock_price_${tokenSymbol.toLowerCase()}`;
    this.cache.set(cacheKey, price, 3600);
    console.log(`Set mock price for ${tokenSymbol}: $${price}`);
  }

  public async simulateVolatility(
    tokenSymbol: string,
    volatilityPercent: number,
    duration: number
  ): Promise<any> {
    console.log(`Simulating ${volatilityPercent}% volatility for ${tokenSymbol} over ${duration}ms`);
    
    return {
      tokenSymbol,
      volatilityPercent,
      duration,
      simulationId: `sim_${Date.now()}`,
      startTime: new Date().toISOString(),
      status: 'started'
    };
  }

  public async getCacheStatus(): Promise<any> {
    const stats = this.cache.getStats();
    const keys = this.cache.keys();
    
    return {
      stats: {
        keys: stats.keys,
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hits / (stats.hits + stats.misses) || 0,
        ksize: stats.ksize,
        vsize: stats.vsize
      },
      keys: keys.length,
      keyList: keys.slice(0, 10),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 심볼을 토큰 ID로 변환하는 헬퍼 메서드
   */
  private getTokenIdBySymbol(symbol: string): string | null {
    const upperSymbol = symbol.toUpperCase();
    for (const [id, sym] of Object.entries(this.supportedTokens)) {
      if (sym === upperSymbol) {
        return id;
      }
    }
    return null;
  }

  /**
   * 토큰 ID를 심볼로 변환하는 헬퍼 메서드
   */
  private getSymbolByTokenId(tokenId: string): string | null {
    return this.supportedTokens[tokenId as keyof typeof this.supportedTokens] || null;
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const priceService = new PriceService();
