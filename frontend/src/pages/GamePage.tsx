// frontend/src/pages/GamePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Settings, 
  Info, 
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react';
import PredictionGame from '../game/PredictionGame';
import GameTimer from '../game/GameTimer';
import ScoreManager from '../game/ScoreManager';

// 타입 정의
interface User {
  id: string;
  nickname: string;
  totalScore: number;
  gamesPlayed: number;
  walletAddress: string;
  missionCompleted: boolean;
}

interface MissionStatus {
  walletInstalled: boolean;
  homepageVisited: boolean;
  allCompleted: boolean;
}

interface GamePageState {
  user: User | null;
  missionStatus: MissionStatus;
  isLoading: boolean;
  error: string | null;
  showRules: boolean;
  showSettings: boolean;
}

interface GameSettings {
  soundEnabled: boolean;
  animationEnabled: boolean;
  autoStart: boolean;
  difficulty: 'easy' | 'normal' | 'hard';
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
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
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
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200'
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

const Alert: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'warning' | 'success';
  className?: string;
}> = ({ 
  children, 
  variant = 'default',
  className = ''
}) => {
  const variantClasses = {
    default: 'bg-blue-50 border-blue-200 text-blue-800',
    destructive: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    success: 'bg-green-50 border-green-200 text-green-800'
  };

  return (
    <div className={`rounded-lg border p-4 ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
};

const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
};

const GamePage: React.FC = () => {
  // 상태 관리
  const [gameState, setGameState] = useState<GamePageState>({
    user: null,
    missionStatus: {
      walletInstalled: false,
      homepageVisited: false,
      allCompleted: false
    },
    isLoading: true,
    error: null,
    showRules: false,
    showSettings: false
  });

  const [gameSettings, setGameSettings] = useState<GameSettings>({
    soundEnabled: true,
    animationEnabled: true,
    autoStart: false,
    difficulty: 'normal'
  });

  // 인증 토큰 가져오기
  const getAuthToken = (): string | null => {
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  };

  // 사용자 정보 로드
  const loadUserInfo = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setGameState(prev => ({
        ...prev,
        error: '로그인이 필요합니다.',
        isLoading: false
      }));
      return;
    }

    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setGameState(prev => ({
          ...prev,
          user: userData,
          isLoading: false
        }));
      } else {
        throw new Error('사용자 정보를 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
      setGameState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        isLoading: false
      }));
    }
  }, []);

  // 미션 상태 확인
  const checkMissionStatus = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await fetch('/api/mission/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const missionData = await response.json();
        setGameState(prev => ({
          ...prev,
          missionStatus: {
            walletInstalled: missionData.walletInstalled || false,
            homepageVisited: missionData.homepageVisited || false,
            allCompleted: missionData.walletInstalled && missionData.homepageVisited
          }
        }));
      }
    } catch (error) {
      console.error('미션 상태 확인 실패:', error);
    }
  }, []);

  // 페이지 초기화
  useEffect(() => {
    loadUserInfo();
    checkMissionStatus();
  }, [loadUserInfo, checkMissionStatus]);

  // 게임 완료 처리
  const handleGameComplete = useCallback((result: { score: number; result: 'WIN' | 'LOSE' }) => {
    if (gameState.user) {
      setGameState(prev => ({
        ...prev,
        user: prev.user ? {
          ...prev.user,
          totalScore: prev.user.totalScore + result.score,
          gamesPlayed: prev.user.gamesPlayed + 1
        } : null
      }));
    }
  }, [gameState.user]);

  // 점수 업데이트 처리
  const handleScoreUpdate = useCallback((newScore: number) => {
    if (gameState.user) {
      setGameState(prev => ({
        ...prev,
        user: prev.user ? {
          ...prev.user,
          totalScore: newScore
        } : null
      }));
    }
  }, [gameState.user]);

  // 설정 변경 처리
  const handleSettingChange = useCallback((key: keyof GameSettings, value: any) => {
    setGameSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      try {
        localStorage.setItem('gameSettings', JSON.stringify(newSettings));
      } catch (error) {
        console.error('설정 저장 실패:', error);
      }
      return newSettings;
    });
  }, []);

  // 설정 로드
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('gameSettings');
      if (savedSettings) {
        setGameSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('설정 로드 실패:', error);
    }
  }, []);

  // 로딩 화면
  if (gameState.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">게임 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 화면
  if (gameState.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">오류 발생</h2>
              <p className="text-gray-600 mb-4">{gameState.error}</p>
              <Button onClick={() => window.location.reload()}>
                새로고침
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Play className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">가격 예측 게임</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {gameState.user && (
                <div className="text-sm text-gray-600">
                  안녕하세요, <span className="font-medium">{gameState.user.nickname}</span>님!
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGameState(prev => ({ ...prev, showRules: true }))}
              >
                <Info className="w-4 h-4 mr-1" />
                게임 규칙
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGameState(prev => ({ ...prev, showSettings: true }))}
              >
                <Settings className="w-4 h-4 mr-1" />
                설정
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 미션 상태 알림 */}
        {!gameState.missionStatus.allCompleted && (
          <Alert variant="warning" className="mb-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-medium">미션을 완료해야 게임에 참여할 수 있습니다!</p>
                <div className="mt-2 space-x-4">
                  <span className={`inline-flex items-center space-x-1 ${gameState.missionStatus.walletInstalled ? 'text-green-600' : 'text-red-600'}`}>
                    {gameState.missionStatus.walletInstalled ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span>Creata Wallet 설치</span>
                  </span>
                  <span className={`inline-flex items-center space-x-1 ${gameState.missionStatus.homepageVisited ? 'text-green-600' : 'text-red-600'}`}>
                    {gameState.missionStatus.homepageVisited ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span>홈페이지 방문 (10초)</span>
                  </span>
                </div>
              </div>
            </div>
          </Alert>
        )}

        {/* 사용자 통계 */}
        {gameState.user && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{gameState.user.totalScore.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">총 점수</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{gameState.user.gamesPlayed}</div>
                  <div className="text-sm text-gray-500">플레이한 게임</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {gameState.user.gamesPlayed > 0 ? Math.round((gameState.user.totalScore / gameState.user.gamesPlayed)) : 0}
                  </div>
                  <div className="text-sm text-gray-500">평균 점수</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    <BarChart3 className="w-8 h-8 mx-auto" />
                  </div>
                  <div className="text-sm text-gray-500">랭킹 보기</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 메인 게임 영역 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* 게임 컴포넌트 */}
          <div className="xl:col-span-2">
            <PredictionGame
              onGameComplete={handleGameComplete}
              onScoreUpdate={handleScoreUpdate}
              disabled={!gameState.missionStatus.allCompleted}
            />
          </div>
          
          {/* 사이드바 */}
          <div className="space-y-6">
            {/* 점수 매니저 */}
            <ScoreManager
              currentStreak={0} // 실제로는 게임 상태에서 가져와야 함
              totalGamesPlayed={gameState.user?.gamesPlayed || 0}
              showAnimation={gameSettings.animationEnabled}
            />
          </div>
        </div>
      </div>

      {/* 게임 규칙 모달 */}
      <Modal
        isOpen={gameState.showRules}
        onClose={() => setGameState(prev => ({ ...prev, showRules: false }))}
        title="게임 규칙"
      >
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">게임 방법</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 선택한 시간 후 암호화폐 가격이 올라갈지(UP) 내려갈지(DOWN) 예측</li>
              <li>• 예측이 맞으면 점수를 획득</li>
              <li>• 빠른 예측, 큰 가격 변화, 연승 시 보너스 점수</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">점수 계산</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 기본 점수: 100점</li>
              <li>• 정확도 보너스: 가격 변화율에 따라 최대 100점</li>
              <li>• 속도 보너스: 빠른 예측 시 최대 75점</li>
              <li>• 연승 보너스: 연속 승리 시 최대 200점</li>
              <li>• 난이도 보너스: 짧은 게임 시간 시 최대 100점</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">참여 조건</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Creata Wallet 앱 설치 필수</li>
              <li>• CreataChain 홈페이지 10초 이상 방문 필수</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* 설정 모달 */}
      <Modal
        isOpen={gameState.showSettings}
        onClose={() => setGameState(prev => ({ ...prev, showSettings: false }))}
        title="게임 설정"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">효과음</label>
            <button
              onClick={() => handleSettingChange('soundEnabled', !gameSettings.soundEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                gameSettings.soundEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  gameSettings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">애니메이션</label>
            <button
              onClick={() => handleSettingChange('animationEnabled', !gameSettings.animationEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                gameSettings.animationEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  gameSettings.animationEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">자동 시작</label>
            <button
              onClick={() => handleSettingChange('autoStart', !gameSettings.autoStart)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                gameSettings.autoStart ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  gameSettings.autoStart ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">난이도</label>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'normal', 'hard'] as const).map((difficulty) => (
                <Button
                  key={difficulty}
                  variant={gameSettings.difficulty === difficulty ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSettingChange('difficulty', difficulty)}
                  className="capitalize"
                >
                  {difficulty === 'easy' ? '쉬움' : difficulty === 'normal' ? '보통' : '어려움'}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GamePage;