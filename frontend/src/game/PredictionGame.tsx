// frontend/src/game/PredictionGame.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Trophy 
} from 'lucide-react';

// 타입 정의
interface PriceData {
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  volume_24h: number;
  last_updated: string;
}

// 백엔드 API 응답 타입 정의
interface StartGameResponse {
  success: boolean;
  data: {
    gameId: string;
    symbol: string;
    startPrice: number;
    startTime: string;
    endTime: string;
    duration: number;
    status: string;
  };
  message?: string;
}

interface PredictResponse {
  success: boolean;
  data: {
    predictionId: string;
    gameId: string;
    prediction: 'UP' | 'DOWN';
    predictionPrice: number;
    confidence: number;
  };
  message?: string;
}

interface GameDetailResponse {
  success: boolean;
  data: {
    id: string;
    symbol: string;
    startPrice: number;
    endPrice?: number;
    startTime: string;
    endTime: string;
    duration: number;
    status: string;
    predictions?: Array<{
      id: string;
      userId: string;
      predictionType: 'UP' | 'DOWN';
      status?: string;
    }>;
    scores?: Array<{
      id: string;
      userId: string;
      points: number;
    }>;
    currentPrice?: number;
    priceChange?: number;
    remainingTime?: number;
    participantCount?: number;
  };
  message?: string;
}

interface GameState {
  id: string | null;
  status: 'idle' | 'active' | 'ended' | 'loading';
  duration: number;
  timeRemaining: number;
  prediction: 'UP' | 'DOWN' | null;
  startPrice: number | null;
  currentPrice: number | null;
  endPrice: number | null;
  result: 'WIN' | 'LOSE' | null;
  score: number | null;
  round: number;
}

interface PredictionGameProps {
  onGameComplete?: (result: { score: number; result: 'WIN' | 'LOSE' }) => void;
  onScoreUpdate?: (score: number) => void;
  disabled?: boolean;
}

// 기본 UI 컴포넌트들
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
    {children}
  </div>
);

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>
    {children}
  </h3>
);

const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
);

const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'outline' | 'destructive';
  size?: 'sm' | 'default' | 'lg';
}> = ({ 
  children, 
  onClick, 
  disabled = false, 
  className = '', 
  variant = 'default',
  size = 'default'
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  
  const variantClasses = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50',
    destructive: 'bg-red-600 text-white hover:bg-red-700'
  };
  
  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    default: 'h-10 py-2 px-4',
    lg: 'h-11 px-8'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </button>
  );
};

const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
  className?: string;
}> = ({ 
  children, 
  variant = 'default',
  className = ''
}) => {
  const variantClasses = {
    default: 'bg-blue-100 text-blue-800',
    destructive: 'bg-red-100 text-red-800'
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

const PredictionGame: React.FC<PredictionGameProps> = ({
  onGameComplete,
  onScoreUpdate,
  disabled = false
}) => {
  // 상태 관리
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    id: null,
    status: 'idle',
    duration: 60, // 기본 1분 게임 (초 단위)
    timeRemaining: 0,
    prediction: null,
    startPrice: null,
    currentPrice: null,
    endPrice: null,
    result: null,
    score: null,
    round: 1
  });
  const [totalScore, setTotalScore] = useState(0);
  const [winStreak, setWinStreak] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 인증 토큰 가져오기 (타입 안전)
  const getAuthToken = (): string | null => {
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  };
  const makeApiCall = async <T,>(
    url: string, 
    options: RequestInit = {}
  ): Promise<T> => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('인증 토큰이 필요합니다.');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  };

  // 실시간 가격 데이터 페치
  const fetchPriceData = useCallback(async () => {
    try {
      const response = await fetch('/api/price/current?symbol=BTC');
      if (response.ok) {
        const result = await response.json();
        // API 응답 구조에 맞게 수정
        setPriceData(result.data || result);
        setGameState(prev => ({
          ...prev,
          currentPrice: result.data?.current_price || result.current_price
        }));
      }
    } catch (error) {
      console.error('가격 데이터 가져오기 실패:', error);
      setError('가격 데이터를 가져올 수 없습니다.');
    }
  }, []);

  // JWT 토큰에서 사용자 ID 추출 (타입 안전)
  const getUserIdFromToken = (): string | null => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      // JWT 토큰 페이로드 디코딩 (검증 없이)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const payload = JSON.parse(jsonPayload);
      return payload.userId || payload.sub || null;
    } catch {
      return null;
    }
  };

  // 게임 시작
  const startGame = useCallback(async () => {
    if (disabled || gameState.status === 'active') return;

    try {
      setError(null);
      setGameState(prev => ({ ...prev, status: 'loading' }));
      
      const result = await makeApiCall<StartGameResponse>('/api/game/start', {
        method: 'POST',
        body: JSON.stringify({
          symbol: 'bitcoin', // CoinGecko API ID 형식
          duration: Math.floor(gameState.duration / 60) // 🔧 분 단위로 변환해서 전송
        })
      });

      if (result.success && result.data) {
        setGameState(prev => ({
          ...prev,
          id: result.data.gameId,
          status: 'active',
          timeRemaining: gameState.duration, // 🔧 원래 초 단위 값 유지
          startPrice: result.data.startPrice,
          prediction: null,
          result: null,
          score: null
        }));
      } else {
        throw new Error(result.message || '게임 시작 실패');
      }
    } catch (error) {
      console.error('게임 시작 오류:', error);
      setError(error instanceof Error ? error.message : '게임 시작 중 오류가 발생했습니다.');
      setGameState(prev => ({ ...prev, status: 'idle' }));
    }
  }, [disabled, gameState.status, gameState.duration]);

  // 예측 제출
  const makePrediction = useCallback(async (prediction: 'UP' | 'DOWN') => {
    if (gameState.status !== 'active' || gameState.prediction || !gameState.id) return;

    try {
      setError(null);
      
      const result = await makeApiCall<PredictResponse>('/api/game/predict', {
        method: 'POST',
        body: JSON.stringify({
          gameId: gameState.id,
          prediction
        })
      });

      if (result.success) {
        setGameState(prev => ({
          ...prev,
          prediction
        }));
      } else {
        throw new Error(result.message || '예측 제출 실패');
      }
    } catch (error) {
      console.error('예측 제출 오류:', error);
      setError(error instanceof Error ? error.message : '예측 제출 중 오류가 발생했습니다.');
    }
  }, [gameState.status, gameState.prediction, gameState.id]);

  // 게임 타이머
  useEffect(() => {
    if (gameState.status === 'active' && gameState.timeRemaining > 0) {
      const timer = setInterval(() => {
        setGameState(prev => {
          const newTimeRemaining = prev.timeRemaining - 1;
          
          if (newTimeRemaining <= 0) {
            // 게임 종료 처리
            return {
              ...prev,
              status: 'ended',
              timeRemaining: 0
            };
          }
          
          return {
            ...prev,
            timeRemaining: newTimeRemaining
          };
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameState.status, gameState.timeRemaining]);

  // 게임 결과 처리
  useEffect(() => {
    if (gameState.status === 'ended' && gameState.id && gameState.prediction) {
      const processGameResult = async () => {
        try {
          setError(null);
          
          // 게임 상세 정보 조회 (결과 포함)
          const result = await makeApiCall<GameDetailResponse>(
            `/api/game/${gameState.id}`
          );

          if (result.success && result.data) {
            const gameData = result.data;
            const currentUserId = getUserIdFromToken(); // 🔧 토큰에서 사용자 ID 추출
            
            // 사용자의 예측과 점수 찾기
            const userPrediction = gameData.predictions?.find(p => p.userId === currentUserId);
            const userScore = gameData.scores?.find(s => s.userId === currentUserId);
            
            // 결과 계산 (게임이 완료된 경우)
            let gameResult: 'WIN' | 'LOSE' | null = null;
            if (gameData.status === 'COMPLETED' && gameData.endPrice && gameState.startPrice) {
              const priceIncreased = gameData.endPrice > gameState.startPrice;
              const predictionCorrect = (gameState.prediction === 'UP' && priceIncreased) || 
                                       (gameState.prediction === 'DOWN' && !priceIncreased);
              gameResult = predictionCorrect ? 'WIN' : 'LOSE';
            }

            setGameState(prev => ({
              ...prev,
              endPrice: gameData.endPrice || gameData.currentPrice || prev.currentPrice,
              result: gameResult,
              score: userScore?.points || 0
            }));

            // 통계 업데이트
            if (gameResult === 'WIN') {
              setWinStreak(prev => prev + 1);
              setTotalWins(prev => prev + 1);
              setTotalScore(prev => {
                const newScore = prev + (userScore?.points || 0);
                onScoreUpdate?.(newScore);
                return newScore;
              });
            } else if (gameResult === 'LOSE') {
              setWinStreak(0);
            }

            setGamesPlayed(prev => prev + 1);

            // 부모 컴포넌트에 결과 전달
            if (gameResult) {
              onGameComplete?.({
                score: userScore?.points || 0,
                result: gameResult
              });
            }
          } else {
            throw new Error(result.message || '게임 결과 조회 실패');
          }
        } catch (error) {
          console.error('게임 결과 처리 오류:', error);
          setError(error instanceof Error ? error.message : '게임 결과 처리 중 오류가 발생했습니다.');
        }
      };

      // 2초 후에 결과 처리 (서버 처리 시간 확보)
      const timeout = setTimeout(processGameResult, 2000);
      return () => clearTimeout(timeout);
    }
  }, [gameState.status, gameState.id, gameState.prediction, gameState.startPrice, onGameComplete, onScoreUpdate]);

  // 실시간 가격 업데이트
  useEffect(() => {
    fetchPriceData();
    const interval = setInterval(fetchPriceData, 1000);
    return () => clearInterval(interval);
  }, [fetchPriceData]);

  // 새 게임 시작
  const startNewGame = useCallback(() => {
    setError(null);
    setGameState(prev => ({
      ...prev,
      id: null,
      status: 'idle',
      timeRemaining: 0,
      prediction: null,
      startPrice: null,
      endPrice: null,
      result: null,
      score: null,
      round: prev.round + 1
    }));
  }, []);

  // 게임 시간 설정
  const setGameDuration = useCallback((duration: number) => {
    if (gameState.status === 'idle') {
      setGameState(prev => ({ ...prev, duration }));
    }
  }, [gameState.status]);

  // 시간 포맷팅
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 가격 변화율 색상
  const getPriceChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* 에러 메시지 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
            <Button
              onClick={() => setError(null)}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              닫기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 게임 통계 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            게임 통계
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{totalScore}</div>
              <div className="text-sm text-gray-500">총점</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{winStreak}</div>
              <div className="text-sm text-gray-500">연승</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{gamesPlayed}</div>
              <div className="text-sm text-gray-500">게임</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {gamesPlayed > 0 ? Math.round((totalWins / gamesPlayed) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-500">승률</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 현재 가격 정보 */}
      {priceData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{priceData.symbol} (BTC)</span>
              <Badge variant={priceData.price_change_percentage_24h >= 0 ? "default" : "destructive"}>
                {priceData.price_change_percentage_24h >= 0 ? '↑' : '↓'} 
                {Math.abs(priceData.price_change_percentage_24h).toFixed(2)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              ${priceData.current_price.toLocaleString()}
            </div>
            <div className={`text-lg ${getPriceChangeColor(priceData.price_change_percentage_24h)}`}>
              24시간: {priceData.price_change_percentage_24h >= 0 ? '+' : ''}
              {priceData.price_change_percentage_24h.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      )}

      {/* 게임 영역 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>가격 예측 게임 - 라운드 {gameState.round}</span>
            {gameState.status === 'active' && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="font-mono text-lg">
                  {formatTime(gameState.timeRemaining)}
                </span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 게임 설정 */}
          {gameState.status === 'idle' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">게임 시간 선택</label>
                <div className="flex gap-2">
                  {[15, 30, 60, 120, 300].map(duration => (
                    <Button
                      key={duration}
                      variant={gameState.duration === duration ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGameDuration(duration)}
                    >
                      {duration < 60 ? `${duration}초` : `${duration / 60}분`}
                    </Button>
                  ))}
                </div>
              </div>
              
              <Button 
                onClick={startGame} 
                disabled={disabled}
                className="w-full"
                size="lg"
              >
                게임 시작
              </Button>
            </div>
          )}

          {/* 게임 진행 중 */}
          {gameState.status === 'active' && (
            <div className="space-y-4">
              {gameState.startPrice && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">시작 가격</div>
                  <div className="text-2xl font-bold">
                    ${gameState.startPrice.toLocaleString()}
                  </div>
                </div>
              )}

              {!gameState.prediction ? (
                <div className="space-y-3">
                  <div className="text-center text-lg font-medium">
                    {formatTime(gameState.timeRemaining)} 후 가격이 어떻게 될까요?
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => makePrediction('UP')}
                      className="h-16 text-lg bg-green-600 hover:bg-green-700"
                    >
                      <TrendingUp className="w-6 h-6 mr-2" />
                      상승 (UP)
                    </Button>
                    <Button
                      onClick={() => makePrediction('DOWN')}
                      className="h-16 text-lg bg-red-600 hover:bg-red-700"
                    >
                      <TrendingDown className="w-6 h-6 mr-2" />
                      하락 (DOWN)
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-600">예측 완료</div>
                  <div className="text-xl font-bold flex items-center justify-center gap-2">
                    {gameState.prediction === 'UP' ? (
                      <>
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <span className="text-green-600">상승 예측</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-5 h-5 text-red-600" />
                        <span className="text-red-600">하락 예측</span>
                      </>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    결과를 기다리는 중...
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 게임 완료 */}
          {gameState.status === 'ended' && (
            <div className="space-y-4">
              {gameState.result && (
                <div className={`text-center p-6 rounded-lg ${
                  gameState.result === 'WIN' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className={`text-3xl font-bold mb-2 ${
                    gameState.result === 'WIN' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {gameState.result === 'WIN' ? '승리!' : '패배'}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>시작: {gameState.startPrice?.toLocaleString()}</div>
                    <div>종료: {gameState.endPrice?.toLocaleString()}</div>
                    <div>예측: {gameState.prediction === 'UP' ? '상승' : '하락'}</div>
                    {gameState.score !== null && (
                      <div className="text-lg font-bold">
                        획득 점수: {gameState.score}점
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button 
                onClick={startNewGame}
                className="w-full"
                size="lg"
              >
                새 게임 시작
              </Button>
            </div>
          )}

          {/* 로딩 상태 */}
          {gameState.status === 'loading' && (
            <div className="text-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div>게임을 준비하는 중...</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 알림 메시지 */}
      {disabled && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="w-4 h-4" />
              <span>미션을 먼저 완료해야 게임에 참여할 수 있습니다.</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PredictionGame;