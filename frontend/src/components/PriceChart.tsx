import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { priceService, type PriceData, type ChartData, type SupportedSymbol, type ChartDataPoint } from '../services/PriceService';

/**
 * 차트 스타일 설정
 */
interface ChartStyle {
  lineColor: string;
  fillColor: string;
  gridColor: string;
  textColor: string;
  backgroundColor: string;
  positiveColor: string;
  negativeColor: string;
}

/**
 * PriceChart 컴포넌트 Props
 */
interface PriceChartProps {
  symbol: SupportedSymbol;
  timeframe?: '1h' | '1d' | '7d' | '30d';
  height?: number;
  width?: number;
  showVolume?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  style?: Partial<ChartStyle>;
  className?: string;
  onPriceChange?: (price: number, change: number) => void;
  onChartError?: (error: Error) => void;
}

/**
 * 툴팁 정보
 */
interface TooltipInfo {
  x: number;
  y: number;
  price: number;
  timestamp: number;
  volume?: number;
  visible: boolean;
}

/**
 * 차트 렌더링 옵션
 */
interface ChartRenderOptions {
  padding: { top: number; right: number; bottom: number; left: number };
  gridLines: { horizontal: number; vertical: number };
  animation: { enabled: boolean; duration: number };
}

/**
 * 실시간 가격 차트 컴포넌트
 */
export const PriceChart: React.FC<PriceChartProps> = ({
  symbol,
  timeframe = '1d',
  height = 400,
  width = 800,
  showVolume = false,
  showGrid = true,
  showTooltip = true,
  style = {},
  className = '',
  onPriceChange,
  onChartError
}) => {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // State
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [currentPrice, setCurrentPrice] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipInfo>({
    x: 0,
    y: 0,
    price: 0,
    timestamp: 0,
    visible: false
  });
  const [canvasSize, setCanvasSize] = useState({ width, height });

  // 기본 차트 스타일
  const defaultStyle: ChartStyle = {
    lineColor: '#3B82F6',
    fillColor: 'rgba(59, 130, 246, 0.1)',
    gridColor: '#E5E7EB',
    textColor: '#374151',
    backgroundColor: '#FFFFFF',
    positiveColor: '#10B981',
    negativeColor: '#EF4444'
  };

  // 최종 스타일 계산
  const finalStyle: ChartStyle = useMemo(() => ({
    ...defaultStyle,
    ...style
  }), [style]);

  // 차트 렌더링 옵션
  const renderOptions: ChartRenderOptions = useMemo(() => ({
    padding: { top: 20, right: 20, bottom: showVolume ? 60 : 40, left: 60 },
    gridLines: { horizontal: 5, vertical: 6 },
    animation: { enabled: true, duration: 1000 }
  }), [showVolume]);

  /**
   * 차트 데이터 로드
   */
  const loadChartData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [chartResponse, priceResponse] = await Promise.all([
        priceService.getChartData(symbol, timeframe),
        priceService.getPrice(symbol)
      ]);

      setChartData(chartResponse);
      setCurrentPrice(priceResponse);

      // 가격 변화 콜백 호출
      if (onPriceChange && priceResponse) {
        onPriceChange(priceResponse.price, priceResponse.changePercent24h);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load chart data';
      setError(errorMessage);
      
      if (onChartError) {
        onChartError(new Error(errorMessage));
      }
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe, onPriceChange, onChartError]);

  /**
   * 실시간 가격 구독
   */
  useEffect(() => {
    const unsubscribe = priceService.subscribe(symbol, (priceData: PriceData) => {
      setCurrentPrice(priceData);
      
      if (onPriceChange) {
        onPriceChange(priceData.price, priceData.changePercent24h);
      }
    });

    return unsubscribe;
  }, [symbol, onPriceChange]);

  /**
   * 차트 데이터 로드
   */
  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  /**
   * 캔버스 크기 조정
   */
  useEffect(() => {
    if (!containerRef.current) return;

    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = rect.width || width;
        const newHeight = rect.height || height;
        
        setCanvasSize({ width: newWidth, height: newHeight });
      }
    };

    // ResizeObserver 설정
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current = new ResizeObserver(updateCanvasSize);
      resizeObserverRef.current.observe(containerRef.current);
    }

    // 초기 크기 설정
    updateCanvasSize();

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [width, height]);

  /**
   * 차트 렌더링
   */
  const renderChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !chartData || chartData.data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 클리어
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // 배경색 설정
    ctx.fillStyle = finalStyle.backgroundColor;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // 차트 영역 계산
    const chartArea = {
      x: renderOptions.padding.left,
      y: renderOptions.padding.top,
      width: canvasSize.width - renderOptions.padding.left - renderOptions.padding.right,
      height: canvasSize.height - renderOptions.padding.top - renderOptions.padding.bottom
    };

    // 가격 범위 계산
    const prices = chartData.data.map(point => point.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1; // 0으로 나누기 방지

    // 시간 범위 계산
    const timestamps = chartData.data.map(point => point.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const timeRange = maxTime - minTime || 1; // 0으로 나누기 방지

    // 좌표 변환 함수
    const getX = (timestamp: number): number => {
      return chartArea.x + ((timestamp - minTime) / timeRange) * chartArea.width;
    };

    const getY = (price: number): number => {
      return chartArea.y + chartArea.height - ((price - minPrice) / priceRange) * chartArea.height;
    };

    // 그리드 그리기
    if (showGrid) {
      ctx.strokeStyle = finalStyle.gridColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // 수평 그리드선
      for (let i = 0; i <= renderOptions.gridLines.horizontal; i++) {
        const y = chartArea.y + (chartArea.height / renderOptions.gridLines.horizontal) * i;
        ctx.beginPath();
        ctx.moveTo(chartArea.x, y);
        ctx.lineTo(chartArea.x + chartArea.width, y);
        ctx.stroke();
      }

      // 수직 그리드선
      for (let i = 0; i <= renderOptions.gridLines.vertical; i++) {
        const x = chartArea.x + (chartArea.width / renderOptions.gridLines.vertical) * i;
        ctx.beginPath();
        ctx.moveTo(x, chartArea.y);
        ctx.lineTo(x, chartArea.y + chartArea.height);
        ctx.stroke();
      }

      ctx.setLineDash([]);
    }

    // 가격 라인 그리기
    if (chartData.data.length > 1) {
      // 영역 채우기
      ctx.beginPath();
      ctx.moveTo(getX(chartData.data[0].timestamp), getY(chartData.data[0].price));
      
      chartData.data.forEach((point, index) => {
        if (index === 0) return;
        ctx.lineTo(getX(point.timestamp), getY(point.price));
      });
      
      ctx.lineTo(getX(chartData.data[chartData.data.length - 1].timestamp), chartArea.y + chartArea.height);
      ctx.lineTo(getX(chartData.data[0].timestamp), chartArea.y + chartArea.height);
      ctx.closePath();
      ctx.fillStyle = finalStyle.fillColor;
      ctx.fill();

      // 가격 라인
      ctx.beginPath();
      ctx.moveTo(getX(chartData.data[0].timestamp), getY(chartData.data[0].price));
      
      chartData.data.forEach((point, index) => {
        if (index === 0) return;
        ctx.lineTo(getX(point.timestamp), getY(point.price));
      });
      
      ctx.strokeStyle = finalStyle.lineColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Y축 라벨 (가격)
    ctx.fillStyle = finalStyle.textColor;
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= renderOptions.gridLines.horizontal; i++) {
      const price = minPrice + (priceRange / renderOptions.gridLines.horizontal) * (renderOptions.gridLines.horizontal - i);
      const y = chartArea.y + (chartArea.height / renderOptions.gridLines.horizontal) * i;
      ctx.fillText(price.toFixed(2), chartArea.x - 10, y + 4);
    }

    // X축 라벨 (시간)
    ctx.textAlign = 'center';
    
    for (let i = 0; i <= renderOptions.gridLines.vertical; i++) {
      const timestamp = minTime + (timeRange / renderOptions.gridLines.vertical) * i;
      const x = chartArea.x + (chartArea.width / renderOptions.gridLines.vertical) * i;
      const date = new Date(timestamp);
      const timeLabel = timeframe === '1h' 
        ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      ctx.fillText(timeLabel, x, chartArea.y + chartArea.height + 20);
    }

    // 현재 가격 표시
    if (currentPrice) {
      const currentY = getY(currentPrice.price);
      
      // 가격 라인
      ctx.strokeStyle = currentPrice.changePercent24h >= 0 ? finalStyle.positiveColor : finalStyle.negativeColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(chartArea.x, currentY);
      ctx.lineTo(chartArea.x + chartArea.width, currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 가격 라벨
      ctx.fillStyle = currentPrice.changePercent24h >= 0 ? finalStyle.positiveColor : finalStyle.negativeColor;
      ctx.fillRect(chartArea.x + chartArea.width - 80, currentY - 10, 75, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(`$${currentPrice.price.toFixed(2)}`, chartArea.x + chartArea.width - 42, currentY + 4);
    }

    // 볼륨 차트 (선택적)
    if (showVolume && chartData.data.some(point => point.volume !== undefined)) {
      const volumeArea = {
        x: chartArea.x,
        y: chartArea.y + chartArea.height + 5,
        width: chartArea.width,
        height: 35
      };

      const volumes = chartData.data.map(point => point.volume || 0);
      const maxVolume = Math.max(...volumes);

      if (maxVolume > 0) {
        chartData.data.forEach((point, index) => {
          const x = getX(point.timestamp);
          const volumeHeight = ((point.volume || 0) / maxVolume) * volumeArea.height;
          
          ctx.fillStyle = finalStyle.gridColor;
          ctx.fillRect(x - 1, volumeArea.y + volumeArea.height - volumeHeight, 2, volumeHeight);
        });
      }
    }
  }, [chartData, currentPrice, canvasSize, finalStyle, renderOptions, showGrid, showVolume, timeframe]);

  /**
   * 차트 렌더링 실행
   */
  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(renderChart);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderChart]);

  /**
   * 마우스 이벤트 처리
   */
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showTooltip || !chartData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 차트 영역 내부인지 확인
    const chartArea = {
      x: renderOptions.padding.left,
      y: renderOptions.padding.top,
      width: canvasSize.width - renderOptions.padding.left - renderOptions.padding.right,
      height: canvasSize.height - renderOptions.padding.top - renderOptions.padding.bottom
    };

    if (x >= chartArea.x && x <= chartArea.x + chartArea.width &&
        y >= chartArea.y && y <= chartArea.y + chartArea.height) {
      
      // 가장 가까운 데이터 포인트 찾기
      const timestamps = chartData.data.map(point => point.timestamp);
      const minTime = Math.min(...timestamps);
      const maxTime = Math.max(...timestamps);
      const timeRange = maxTime - minTime || 1;
      
      const relativeX = (x - chartArea.x) / chartArea.width;
      const targetTime = minTime + relativeX * timeRange;
      
      let closestPoint = chartData.data[0];
      let minDistance = Math.abs(closestPoint.timestamp - targetTime);
      
      chartData.data.forEach(point => {
        const distance = Math.abs(point.timestamp - targetTime);
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = point;
        }
      });

      setTooltip({
        x: event.clientX,
        y: event.clientY,
        price: closestPoint.price,
        timestamp: closestPoint.timestamp,
        volume: closestPoint.volume,
        visible: true
      });
    } else {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [showTooltip, chartData, canvasSize, renderOptions]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  /**
   * 컴포넌트 정리
   */
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  // 로딩 상태
  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 rounded-lg ${className}`} 
           style={{ width: canvasSize.width, height: canvasSize.height }}>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading chart...</span>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className={`flex items-center justify-center bg-red-50 border border-red-200 rounded-lg ${className}`}
           style={{ width: canvasSize.width, height: canvasSize.height }}>
        <div className="text-center">
          <div className="text-red-600 font-medium">Chart Error</div>
          <div className="text-red-500 text-sm mt-1">{error}</div>
          <button 
            onClick={loadChartData}
            className="mt-2 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <canvas
        ref={canvasRef}
        style={{ width, height }}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="cursor-crosshair"
      />
      
      {/* 툴팁 */}
      {tooltip.visible && showTooltip && (
        <div 
          className="fixed z-50 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 shadow-lg pointer-events-none"
          style={{ left: tooltip.x + 10, top: tooltip.y - 40 }}
        >
          <div className="font-medium">${tooltip.price.toFixed(2)}</div>
          <div className="text-gray-300">
            {new Date(tooltip.timestamp).toLocaleString()}
          </div>
          {tooltip.volume !== undefined && (
            <div className="text-gray-300">
              Vol: {tooltip.volume.toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PriceChart;