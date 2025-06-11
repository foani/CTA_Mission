// frontend/src/game/ScoreManager.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Star, 
  Award, 
  Zap,
  Clock,
  Flame
} from 'lucide-react';

// 타입 정의
interface ScoreData {
  baseScore: number;
  accuracyBonus: number;
  speedBonus: number;
  streakBonus: number;
  difficultyBonus: number;
  totalScore: number;
  multiplier: number;
}

interface GameResult {
  prediction: 'UP' | 'DOWN';
  actualDirection: 'UP' | 'DOWN';
  priceChange: number;
  timeUsed: number;
  gameDuration: number;
  isCorrect: boolean;
}

interface ScoreManagerProps {
  gameResult?: GameResult;
  currentStreak?: number;
  totalGamesPlayed?: number;
  onScoreCalculated?: (scoreData: ScoreData) => void;
  showAnimation?: boolean;
  animationDuration?: number;
  className?: string;
}

interface ScoreBreakdown {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  description: string;
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

const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  className?: string;
}> = ({ 
  children, 
  variant = 'default',
  className = ''
}) => {
  const variantClasses = {
    default: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    destructive: 'bg-red-100 text-red-800'
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

const ScoreManager: React.FC<ScoreManagerProps> = ({
  gameResult,
  currentStreak = 0,
  totalGamesPlayed = 0,
  onScoreCalculated,
  showAnimation = true,
  animationDuration = 2000,
  className = ''
}) => {
  // 상태 관리
  const [scoreData, setScoreData] = useState<ScoreData>({
    baseScore: 0,
    accuracyBonus: 0,
    speedBonus: 0,
    streakBonus: 0,
    difficultyBonus: 0,
    totalScore: 0,
    multiplier: 1.0
  });

  const [isAnimating, setIsAnimating] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);

  // 점수 계산 로직
  const calculateScore = useCallback((result: GameResult): ScoreData => {
    if (!result.isCorrect) {
      return {
        baseScore: 0,
        accuracyBonus: 0,
        speedBonus: 0,
        streakBonus: 0,
        difficultyBonus: 0,
        totalScore: 0,
        multiplier: 0
      };
    }

    // 1. 기본 점수 (100점)
    const baseScore = 100;

    // 2. 정확도 보너스 (가격 변화율에 따라)
    const priceChangePercent = Math.abs(result.priceChange);
    let accuracyBonus = 0;
    if (priceChangePercent >= 5) accuracyBonus = 100; // 5% 이상 변화
    else if (priceChangePercent >= 2) accuracyBonus = 50; // 2% 이상 변화
    else if (priceChangePercent >= 1) accuracyBonus = 25; // 1% 이상 변화
    else accuracyBonus = 10; // 1% 미만 변화

    // 3. 속도 보너스 (예측 제출 시간에 따라)
    const timeRatio = result.timeUsed / result.gameDuration;
    let speedBonus = 0;
    if (timeRatio <= 0.1) speedBonus = 75; // 10% 이내 빠른 예측
    else if (timeRatio <= 0.25) speedBonus = 50; // 25% 이내
    else if (timeRatio <= 0.5) speedBonus = 25; // 50% 이내
    else speedBonus = 0; // 50% 초과

    // 4. 연승 보너스
    let streakBonus = 0;
    if (currentStreak >= 10) streakBonus = 200;
    else if (currentStreak >= 5) streakBonus = 100;
    else if (currentStreak >= 3) streakBonus = 50;
    else streakBonus = currentStreak * 10;

    // 5. 난이도 보너스 (게임 시간에 따라)
    let difficultyBonus = 0;
    if (result.gameDuration <= 30) difficultyBonus = 100; // 30초 이하 초단기
    else if (result.gameDuration <= 60) difficultyBonus = 50; // 1분 이하 단기
    else if (result.gameDuration <= 180) difficultyBonus = 25; // 3분 이하 중기
    else difficultyBonus = 0; // 장기

    // 6. 멀티플라이어 (경험에 따라)
    let multiplier = 1.0;
    if (totalGamesPlayed >= 100) multiplier = 1.5;
    else if (totalGamesPlayed >= 50) multiplier = 1.3;
    else if (totalGamesPlayed >= 20) multiplier = 1.2;
    else if (totalGamesPlayed >= 10) multiplier = 1.1;

    // 총점 계산
    const subtotal = baseScore + accuracyBonus + speedBonus + streakBonus + difficultyBonus;
    const totalScore = Math.round(subtotal * multiplier);

    return {
      baseScore,
      accuracyBonus,
      speedBonus,
      streakBonus,
      difficultyBonus,
      totalScore,
      multiplier
    };
  }, [currentStreak, totalGamesPlayed]);

  // 점수 애니메이션
  const animateScore = useCallback((targetScore: number) => {
    if (!showAnimation || targetScore === 0) {
      setDisplayScore(targetScore);
      return;
    }

    setIsAnimating(true);
    const startTime = Date.now();
    const startScore = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // easeOutCubic 곡선 적용
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentScore = Math.round(startScore + (targetScore - startScore) * easeOutCubic);
      
      setDisplayScore(currentScore);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  }, [showAnimation, animationDuration]);

  // 게임 결과 변경 시 점수 계산
  useEffect(() => {
    if (gameResult) {
      const newScoreData = calculateScore(gameResult);
      setScoreData(newScoreData);
      animateScore(newScoreData.totalScore);
      onScoreCalculated?.(newScoreData);
    }
  }, [gameResult, calculateScore, animateScore, onScoreCalculated]);

  // 점수 세부 항목 생성
  const getScoreBreakdown = (): ScoreBreakdown[] => {
    return [
      {
        label: '기본 점수',
        value: scoreData.baseScore,
        icon: <Target className="w-4 h-4" />,
        color: 'text-blue-600',
        description: '예측 성공 기본 점수'
      },
      {
        label: '정확도 보너스',
        value: scoreData.accuracyBonus,
        icon: <Star className="w-4 h-4" />,
        color: 'text-yellow-600',
        description: '가격 변화율에 따른 보너스'
      },
      {
        label: '속도 보너스',
        value: scoreData.speedBonus,
        icon: <Zap className="w-4 h-4" />,
        color: 'text-purple-600',
        description: '빠른 예측 제출 보너스'
      },
      {
        label: '연승 보너스',
        value: scoreData.streakBonus,
        icon: <Flame className="w-4 h-4" />,
        color: 'text-red-600',
        description: `${currentStreak}연승 달성 보너스`
      },
      {
        label: '난이도 보너스',
        value: scoreData.difficultyBonus,
        icon: <Clock className="w-4 h-4" />,
        color: 'text-green-600',
        description: '짧은 게임 시간 보너스'
      }
    ];
  };

  // 등급 계산
  const getGrade = (score: number): { grade: string; color: string; description: string } => {
    if (score >= 500) return { grade: 'S+', color: 'text-purple-600', description: '전설적' };
    if (score >= 400) return { grade: 'S', color: 'text-purple-500', description: '완벽한' };
    if (score >= 300) return { grade: 'A+', color: 'text-blue-600', description: '우수한' };
    if (score >= 250) return { grade: 'A', color: 'text-blue-500', description: '좋은' };
    if (score >= 200) return { grade: 'B+', color: 'text-green-600', description: '양호한' };
    if (score >= 150) return { grade: 'B', color: 'text-green-500', description: '보통' };
    if (score >= 100) return { grade: 'C', color: 'text-yellow-600', description: '기본' };
    return { grade: 'F', color: 'text-red-600', description: '실패' };
  };

  const currentGrade = getGrade(scoreData.totalScore);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 메인 점수 표시 */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div className="text-4xl font-bold text-gray-800">
                {displayScore.toLocaleString()}
              </div>
              <div className="text-lg text-gray-600">점</div>
            </div>

            {/* 등급 표시 */}
            <div className="flex items-center justify-center space-x-2">
              <Award className={`w-6 h-6 ${currentGrade.color}`} />
              <Badge 
                variant={scoreData.totalScore > 0 ? 'success' : 'destructive'}
                className="text-lg px-4 py-2"
              >
                {currentGrade.grade} 등급
              </Badge>
              <span className={`text-sm ${currentGrade.color}`}>
                ({currentGrade.description})
              </span>
            </div>

            {/* 멀티플라이어 표시 */}
            {scoreData.multiplier > 1.0 && (
              <div className="flex items-center justify-center space-x-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-orange-600">
                  경험 보너스: x{scoreData.multiplier}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 점수 세부 내역 */}
      {scoreData.totalScore > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>점수 세부 내역</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getScoreBreakdown().map((item, index) => (
                <div key={item.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={item.color}>
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                  </div>
                  <div className={`font-bold ${item.color}`}>
                    +{item.value}
                  </div>
                </div>
              ))}
              
              {/* 소계 */}
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="font-semibold text-blue-900">소계</div>
                  <div className="font-bold text-blue-600">
                    {(scoreData.baseScore + scoreData.accuracyBonus + scoreData.speedBonus + 
                      scoreData.streakBonus + scoreData.difficultyBonus).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* 멀티플라이어 적용 */}
              {scoreData.multiplier > 1.0 && (
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    <span className="font-semibold text-orange-900">
                      경험 보너스 (x{scoreData.multiplier})
                    </span>
                  </div>
                  <div className="font-bold text-orange-600">
                    +{(scoreData.totalScore - (scoreData.baseScore + scoreData.accuracyBonus + 
                       scoreData.speedBonus + scoreData.streakBonus + scoreData.difficultyBonus)).toLocaleString()}
                  </div>
                </div>
              )}

              {/* 최종 점수 */}
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="font-bold text-gray-900 text-lg">최종 점수</span>
                  </div>
                  <div className="font-bold text-2xl text-green-600">
                    {scoreData.totalScore.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 애니메이션 중 표시 */}
      {isAnimating && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">점수 계산 중...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoreManager;