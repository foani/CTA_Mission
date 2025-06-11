import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

// 환경 변수 안전성 확보
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:5000';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * WebSocket 연결 상태
 */
export type WebSocketReadyState = 
  | 'CONNECTING' 
  | 'OPEN' 
  | 'CLOSING' 
  | 'CLOSED' 
  | 'UNINSTANTIATED';

/**
 * WebSocket 메시지 타입
 */
export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: number;
  id?: string;
}

/**
 * 가격 업데이트 메시지
 */
export interface PriceUpdateMessage {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  timestamp: number;
}

/**
 * 랭킹 업데이트 메시지
 */
export interface RankingUpdateMessage {
  userId: string;
  newRank: number;
  oldRank: number;
  score: number;
  timestamp: number;
}

/**
 * 게임 상태 업데이트 메시지
 */
export interface GameStateMessage {
  gameId: string;
  status: 'waiting' | 'active' | 'ended';
  currentRound: number;
  timeRemaining: number;
  participants: number;
}

/**
 * 에어드롭 알림 메시지
 */
export interface AirdropNotificationMessage {
  userId: string;
  amount: string;
  rank: number;
  period: 'weekly' | 'monthly';
  txHash?: string;
}

/**
 * WebSocket 구독 옵션
 */
export interface WebSocketSubscription {
  channel: string;
  params?: Record<string, any>;
}

/**
 * useWebSocket 훅 옵션
 */
export interface UseWebSocketOptions {
  /** WebSocket URL (선택적, 기본값 사용 가능) */
  url?: string;
  
  /** 자동 연결 여부 */
  shouldReconnect?: boolean;
  
  /** 재연결 시도 횟수 */
  reconnectAttempts?: number;
  
  /** 재연결 간격 (밀리초) */
  reconnectInterval?: number;
  
  /** 하트비트 간격 (밀리초) */
  heartbeatInterval?: number;
  
  /** 연결 타임아웃 (밀리초) */
  connectionTimeout?: number;
  
  /** 폴링 폴백 사용 여부 */
  enablePollingFallback?: boolean;
  
  /** 폴링 간격 (밀리초) */
  pollingInterval?: number;
  
  /** 인증 토큰 */
  authToken?: string;
  
  /** 디버그 모드 */
  debug?: boolean;
  
  /** 메시지 필터 함수 */
  messageFilter?: (message: WebSocketMessage) => boolean;
  
  /** 에러 핸들러 */
  onError?: (error: Event | Error) => void;
  
  /** 연결 상태 변경 핸들러 */
  onConnectionChange?: (state: WebSocketReadyState) => void;
}

/**
 * useWebSocket 훅 반환값
 */
export interface UseWebSocketReturn<T = any> {
  /** 마지막 수신 메시지 */
  lastMessage: WebSocketMessage<T> | null;
  
  /** 메시지 전송 함수 */
  sendMessage: (message: WebSocketMessage) => void;
  
  /** 채널 구독 함수 */
  subscribe: (subscription: WebSocketSubscription) => () => void;
  
  /** 연결 상태 */
  readyState: WebSocketReadyState;
  
  /** 연결 함수 */
  connect: () => void;
  
  /** 연결 해제 함수 */
  disconnect: () => void;
  
  /** 수동 재연결 함수 */
  reconnect: () => void;
  
  /** 연결 여부 */
  isConnected: boolean;
  
  /** 에러 상태 */
  error: string | null;
  
  /** 폴링 모드 여부 */
  isPollingMode: boolean;
}

/**
 * 폴링 상태 관리
 */
interface PollingState {
  isActive: boolean;
  interval: number | null;
  subscriptions: Set<string>;
  lastFetch: number;
}

/**
 * WebSocket 연결 및 실시간 통신을 위한 React 훅
 * WebSocket 연결 실패 시 폴링으로 자동 폴백
 */
export function useWebSocket<T = any>(
  url?: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn<T> {
  const {
    shouldReconnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    heartbeatInterval = 30000,
    connectionTimeout = 10000,
    enablePollingFallback = true,
    pollingInterval = 5000,
    authToken,
    debug = false,
    messageFilter,
    onError,
    onConnectionChange
  } = options;

  // WebSocket 및 상태 관리
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatTimeoutRef = useRef<number | null>(null);
  const connectionTimeoutRef = useRef<number | null>(null);
  const mountedRef = useRef<boolean>(true);
  const reconnectCountRef = useRef<number>(0);

  // 폴링 상태 관리
  const pollingStateRef = useRef<PollingState>({
    isActive: false,
    interval: null,
    subscriptions: new Set(),
    lastFetch: 0
  });

  // React 상태
  const [lastMessage, setLastMessage] = useState<WebSocketMessage<T> | null>(null);
  const [readyState, setReadyState] = useState<WebSocketReadyState>('UNINSTANTIATED');
  const [error, setError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<Map<string, WebSocketSubscription>>(new Map());

  // WebSocket URL 계산
  const wsUrl = useMemo(() => {
    if (url) return url;
    
    const baseUrl = WS_BASE_URL.replace(/^http/, 'ws');
    const authParam = authToken ? `?token=${encodeURIComponent(authToken)}` : '';
    return `${baseUrl}/ws${authParam}`;
  }, [url, authToken]);

  // 연결 상태 계산
  const isConnected = useMemo(() => readyState === 'OPEN', [readyState]);
  const isPollingMode = useMemo(() => pollingStateRef.current.isActive, [lastMessage]);

  // 디버그 로깅
  const debugLog = useCallback((message: string, ...args: any[]) => {
    if (debug) {
      console.log(`[useWebSocket] ${message}`, ...args);
    }
  }, [debug]);

  // 에러 처리
  const handleError = useCallback((error: Event | Error, context: string) => {
    const errorMessage = error instanceof Error ? error.message : 'WebSocket error';
    debugLog(`Error in ${context}:`, errorMessage);
    setError(errorMessage);
    
    if (onError) {
      onError(error);
    }
  }, [debugLog, onError]);

  // 연결 상태 변경 처리
  const updateReadyState = useCallback((newState: WebSocketReadyState) => {
    debugLog('Ready state changed:', newState);
    setReadyState(newState);
    
    if (onConnectionChange) {
      onConnectionChange(newState);
    }
  }, [debugLog, onConnectionChange]);

  // 하트비트 전송
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const heartbeatMessage: WebSocketMessage = {
        type: 'heartbeat',
        data: { timestamp: Date.now() },
        timestamp: Date.now()
      };
      
      wsRef.current.send(JSON.stringify(heartbeatMessage));
      debugLog('Heartbeat sent');
    }
  }, [debugLog]);

  // 하트비트 스케줄링
  const scheduleHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    
    heartbeatTimeoutRef.current = window.setTimeout(() => {
      sendHeartbeat();
      scheduleHeartbeat();
    }, heartbeatInterval);
  }, [sendHeartbeat, heartbeatInterval]);

  // 폴링 데이터 가져오기
  const fetchPollingData = useCallback(async () => {
    if (!pollingStateRef.current.isActive || pollingStateRef.current.subscriptions.size === 0) {
      return;
    }

    try {
      const now = Date.now();
      const subscriptionChannels = Array.from(pollingStateRef.current.subscriptions);
      
      // 병렬로 각 채널 데이터 가져오기
      const promises = subscriptionChannels.map(async (channel) => {
        try {
          let endpoint = '';
          
          // 채널별 적절한 API 엔드포인트 매핑
          switch (channel) {
            case 'price.btc':
            case 'price.eth':
            case 'price.cta':
              const symbol = channel.split('.')[1].toUpperCase();
              endpoint = `/api/price/${symbol === 'BTC' ? 'bitcoin' : symbol === 'ETH' ? 'ethereum' : 'cardano'}`;
              break;
            case 'ranking.weekly':
              endpoint = '/api/ranking/weekly?limit=10';
              break;
            case 'ranking.monthly':
              endpoint = '/api/ranking/monthly?limit=10';
              break;
            case 'game.state':
              endpoint = '/api/game/current-state';
              break;
            default:
              return null;
          }

          if (!endpoint) return null;

          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
            signal: AbortSignal.timeout(5000)
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          
          return {
            type: `polling.${channel}`,
            data: data.data || data,
            timestamp: now,
            id: `polling_${channel}_${now}`
          };
        } catch (error) {
          debugLog(`Polling error for channel ${channel}:`, error);
          return null;
        }
      });

      const results = await Promise.allSettled(promises);
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          const message = result.value as WebSocketMessage<T>;
          
          // 메시지 필터링
          if (!messageFilter || messageFilter(message)) {
            setLastMessage(message);
          }
        }
      });

      pollingStateRef.current.lastFetch = now;
    } catch (error) {
      handleError(error as Error, 'polling');
    }
  }, [authToken, debugLog, messageFilter, handleError]);

  // 폴링 시작
  const startPolling = useCallback(() => {
    if (pollingStateRef.current.isActive) return;

    debugLog('Starting polling fallback');
    pollingStateRef.current.isActive = true;
    
    // 즉시 한 번 실행
    fetchPollingData();
    
    // 정기적 폴링 설정
    pollingStateRef.current.interval = window.setInterval(fetchPollingData, pollingInterval);
  }, [debugLog, fetchPollingData, pollingInterval]);

  // 폴링 중지
  const stopPolling = useCallback(() => {
    if (!pollingStateRef.current.isActive) return;

    debugLog('Stopping polling');
    pollingStateRef.current.isActive = false;
    
    if (pollingStateRef.current.interval) {
      clearInterval(pollingStateRef.current.interval);
      pollingStateRef.current.interval = null;
    }
  }, [debugLog]);

  // WebSocket 메시지 핸들러
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage<T> = JSON.parse(event.data);
      
      // 하트비트 응답 처리
      if (message.type === 'heartbeat') {
        debugLog('Heartbeat received');
        return;
      }

      // 메시지 필터링
      if (messageFilter && !messageFilter(message)) {
        return;
      }

      setLastMessage(message);
      setError(null);
      
      debugLog('Message received:', message);
    } catch (error) {
      handleError(error as Error, 'message parsing');
    }
  }, [debugLog, messageFilter, handleError]);

  // WebSocket 연결
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    debugLog('Attempting WebSocket connection to:', wsUrl);
    updateReadyState('CONNECTING');
    setError(null);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // 연결 타임아웃 설정
      connectionTimeoutRef.current = window.setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          debugLog('Connection timeout');
          ws.close();
          
          if (enablePollingFallback) {
            startPolling();
          }
        }
      }, connectionTimeout);

      ws.onopen = () => {
        debugLog('WebSocket connected');
        updateReadyState('OPEN');
        reconnectCountRef.current = 0;
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        
        // 폴링 중지 (WebSocket 연결 성공)
        stopPolling();
        
        // 하트비트 시작
        scheduleHeartbeat();
        
        // 기존 구독 재등록
        subscriptions.forEach((subscription) => {
          const message: WebSocketMessage = {
            type: 'subscribe',
            data: subscription,
            timestamp: Date.now()
          };
          ws.send(JSON.stringify(message));
        });
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        debugLog('WebSocket closed:', event.code, event.reason);
        updateReadyState('CLOSED');
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
        }

        // 재연결 시도
        if (shouldReconnect && mountedRef.current && 
            reconnectCountRef.current < reconnectAttempts) {
          
          reconnectCountRef.current++;
          debugLog(`Reconnection attempt ${reconnectCountRef.current}/${reconnectAttempts}`);
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (enablePollingFallback) {
          // WebSocket 재연결 실패 시 폴링으로 폴백
          debugLog('WebSocket reconnection failed, falling back to polling');
          startPolling();
        }
      };

      ws.onerror = (error) => {
        debugLog('WebSocket error:', error);
        handleError(error, 'websocket');
        
        if (enablePollingFallback && reconnectCountRef.current >= reconnectAttempts) {
          startPolling();
        }
      };

    } catch (error) {
      handleError(error as Error, 'websocket creation');
      updateReadyState('CLOSED');
      
      if (enablePollingFallback) {
        startPolling();
      }
    }
  }, [wsUrl, debugLog, updateReadyState, connectionTimeout, enablePollingFallback, 
      startPolling, stopPolling, scheduleHeartbeat, subscriptions, handleMessage, 
      shouldReconnect, reconnectAttempts, reconnectInterval, handleError]);

  // WebSocket 연결 해제
  const disconnect = useCallback(() => {
    debugLog('Disconnecting WebSocket');
    mountedRef.current = false;
    
    // 타이머들 정리
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    
    // 폴링 중지
    stopPolling();
    
    // WebSocket 연결 종료
    if (wsRef.current) {
      updateReadyState('CLOSING');
      wsRef.current.close();
      wsRef.current = null;
    }
    
    updateReadyState('CLOSED');
  }, [debugLog, stopPolling, updateReadyState]);

  // 수동 재연결
  const reconnect = useCallback(() => {
    debugLog('Manual reconnection triggered');
    reconnectCountRef.current = 0;
    disconnect();
    
    setTimeout(() => {
      mountedRef.current = true;
      connect();
    }, 100);
  }, [debugLog, disconnect, connect]);

  // 메시지 전송
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const messageWithTimestamp = {
        ...message,
        timestamp: message.timestamp || Date.now()
      };
      
      wsRef.current.send(JSON.stringify(messageWithTimestamp));
      debugLog('Message sent:', messageWithTimestamp);
    } else {
      debugLog('Cannot send message - WebSocket not connected');
      setError('WebSocket not connected');
    }
  }, [debugLog]);

  // 채널 구독
  const subscribe = useCallback((subscription: WebSocketSubscription) => {
    const key = `${subscription.channel}_${JSON.stringify(subscription.params || {})}`;
    
    setSubscriptions(prev => new Map(prev.set(key, subscription)));
    pollingStateRef.current.subscriptions.add(subscription.channel);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type: 'subscribe',
        data: subscription,
        timestamp: Date.now()
      };
      sendMessage(message);
    }
    
    debugLog('Subscribed to channel:', subscription.channel);
    
    // 구독 해제 함수 반환
    return () => {
      setSubscriptions(prev => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
      
      pollingStateRef.current.subscriptions.delete(subscription.channel);
      
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const message: WebSocketMessage = {
          type: 'unsubscribe',
          data: subscription,
          timestamp: Date.now()
        };
        sendMessage(message);
      }
      
      debugLog('Unsubscribed from channel:', subscription.channel);
    };
  }, [sendMessage, debugLog]);

  // 초기 연결
  useEffect(() => {
    if (wsUrl) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [wsUrl]); // connect와 disconnect는 의존성에서 제외 (무한루프 방지)

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [disconnect]);

  return {
    lastMessage,
    sendMessage,
    subscribe,
    readyState,
    connect,
    disconnect,
    reconnect,
    isConnected,
    error,
    isPollingMode
  };
}

export default useWebSocket;