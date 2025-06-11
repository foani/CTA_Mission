// frontend/src/game/GameTimer.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Play, Pause, Square, AlertTriangle } from 'lucide-react';

// 타입 정의
interface GameTimerProps {
  duration: number; // 게임 시간 (초)
  isActive: boolean; // 타이머 활성 상태
  onTimeUp?: () => void; // 시간 종료 콜백
  onTick?: (timeRemaining: number) => void; // 매 초마다 호출되는 콜백
  onPause?: () => void; // 일시정지 콜백
  onResume?: () => void; // 재개 콜백
  onReset?: () => void; // 리셋 콜백
  showControls?: boolean; // 컨트롤 버튼 표시 여부
  warningThreshold?: number; // 경고 표시 임계값 (초)
  className?: string;
}

interface TimerState {
  timeRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
  hasWarning: boolean;
  startTime: number | null;
  endTime: number | null;
}

// 기본 UI 컴포넌트들
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
    sm: 'h-8 px-3 text-sm',
    default: 'h-9 py-2 px-3',
    lg: 'h-10 px-4'
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

const GameTimer: React.FC<GameTimerProps> = ({
  duration,
  isActive,
  onTimeUp,
  onTick,
  onPause,
  onResume,
  onReset,
  showControls = false,
  warningThreshold = 30,
  className = ''
}) => {
  // 상태 관리
  const [timerState, setTimerState] = useState<TimerState>({
    timeRemaining: duration,
    isRunning: false,
    isPaused: false,
    hasWarning: false,
    startTime: null,
    endTime: null
  });

  // 타이머 시작
  const startTimer = useCallback(() => {
    const now = Date.now();
    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      startTime: now,
      endTime: now + (prev.timeRemaining * 1000),
      hasWarning: prev.timeRemaining <= warningThreshold
    }));
  }, [warningThreshold]);

  // 타이머 일시정지
  const pauseTimer = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: true,
      endTime: null
    }));
    onPause?.();
  }, [onPause]);

  // 타이머 재개
  const resumeTimer = useCallback(() => {
    const now = Date.now();
    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      endTime: now + (prev.timeRemaining * 1000)
    }));
    onResume?.();
  }, [onResume]);

  // 타이머 리셋
  const resetTimer = useCallback(() => {
    setTimerState({
      timeRemaining: duration,
      isRunning: false,
      isPaused: false,
      hasWarning: false,
      startTime: null,
      endTime: null
    });
    onReset?.();
  }, [duration, onReset]);

  // 타이머 정지
  const stopTimer = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      endTime: null
    }));
  }, []);

  // isActive 상태에 따른 타이머 제어
  useEffect(() => {
    if (isActive && !timerState.isRunning && !timerState.isPaused) {
      startTimer();
    } else if (!isActive && timerState.isRunning) {
      stopTimer();
    }
  }, [isActive, timerState.isRunning, timerState.isPaused, startTimer, stopTimer]);

  // duration 변경 시 타이머 리셋
  useEffect(() => {
    if (!timerState.isRunning) {
      setTimerState(prev => ({
        ...prev,
        timeRemaining: duration,
        hasWarning: duration <= warningThreshold
      }));
    }
  }, [duration, warningThreshold, timerState.isRunning]);

  // 메인 타이머 로직
  useEffect(() => {
    if (!timerState.isRunning || !timerState.endTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((timerState.endTime! - now) / 1000));

      setTimerState(prev => ({
        ...prev,
        timeRemaining: remaining,
        hasWarning: remaining <= warningThreshold && remaining > 0
      }));

      // 매 초마다 콜백 호출
      onTick?.(remaining);

      // 시간 종료
      if (remaining <= 0) {
        setTimerState(prev => ({
          ...prev,
          isRunning: false,
          timeRemaining: 0,
          hasWarning: false
        }));
        onTimeUp?.();
      }
    }, 100); // 100ms 간격으로 정확한 시간 체크

    return () => clearInterval(interval);
  }, [timerState.isRunning, timerState.endTime, warningThreshold, onTick, onTimeUp]);

  // 시간 포맷팅
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 진행률 계산
  const getProgress = (): number => {
    if (duration <= 0) return 0;
    return ((duration - timerState.timeRemaining) / duration) * 100;
  };

  // 타이머 색상 결정
  const getTimerColor = (): string => {
    if (timerState.timeRemaining === 0) return 'text-gray-500';
    if (timerState.hasWarning) return 'text-red-500';
    if (timerState.timeRemaining <= duration * 0.5) return 'text-orange-500';
    return 'text-green-500';
  };

  // 진행 바 색상 결정
  const getProgressColor = (): string => {
    if (timerState.timeRemaining === 0) return 'bg-gray-400';
    if (timerState.hasWarning) return 'bg-red-500';
    if (timerState.timeRemaining <= duration * 0.5) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* 메인 타이머 디스플레이 */}
      <div className="flex items-center space-x-3">
        <Clock className={`w-6 h-6 ${getTimerColor()}`} />
        <div className={`text-4xl font-mono font-bold ${getTimerColor()}`}>
          {formatTime(timerState.timeRemaining)}
        </div>
        {timerState.hasWarning && (
          <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
        )}
      </div>

      {/* 진행 바 */}
      <div className="w-full max-w-md">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${getProgress()}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0:00</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* 상태 표시 */}
      <div className="flex items-center space-x-2">
        {timerState.isRunning && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse" />
            실행 중
          </span>
        )}
        {timerState.isPaused && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Pause className="w-3 h-3 mr-1" />
            일시정지
          </span>
        )}
        {timerState.timeRemaining === 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Square className="w-3 h-3 mr-1" />
            종료
          </span>
        )}
      </div>

      {/* 컨트롤 버튼 (선택적) */}
      {showControls && (
        <div className="flex items-center space-x-2">
          {!timerState.isRunning && !timerState.isPaused && timerState.timeRemaining > 0 && (
            <Button
              onClick={startTimer}
              variant="default"
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-1" />
              시작
            </Button>
          )}
          
          {timerState.isRunning && (
            <Button
              onClick={pauseTimer}
              variant="outline"
              size="sm"
            >
              <Pause className="w-4 h-4 mr-1" />
              일시정지
            </Button>
          )}
          
          {timerState.isPaused && (
            <Button
              onClick={resumeTimer}
              variant="default"
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-1" />
              재개
            </Button>
          )}
          
          {(timerState.isRunning || timerState.isPaused || timerState.timeRemaining !== duration) && (
            <Button
              onClick={resetTimer}
              variant="destructive"
              size="sm"
            >
              <Square className="w-4 h-4 mr-1" />
              리셋
            </Button>
          )}
        </div>
      )}

      {/* 디버그 정보 (개발 환경에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 space-y-1">
          <div>상태: {timerState.isRunning ? '실행중' : timerState.isPaused ? '일시정지' : '정지'}</div>
          <div>진행률: {getProgress().toFixed(1)}%</div>
          <div>경고: {timerState.hasWarning ? 'ON' : 'OFF'}</div>
        </div>
      )}
    </div>
  );
};

export default GameTimer;