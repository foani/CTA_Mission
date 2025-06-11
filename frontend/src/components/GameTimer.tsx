import React, { useState, useEffect, useCallback } from 'react';

interface GameTimerProps {
  duration: number; // 초 단위
  onTimeUp: () => void;
  isActive: boolean;
  className?: string;
}

const GameTimer: React.FC<GameTimerProps> = ({ 
  duration, 
  onTimeUp, 
  isActive, 
  className = '' 
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  // onTimeUp을 useCallback으로 메모이제이션하여 불필요한 리렌더링 방지
  const handleTimeUp = useCallback(() => {
    onTimeUp();
  }, [onTimeUp]);

  // duration이 변경될 때 timeLeft 초기화
  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  // 타이머 로직 - isActive 상태에 따라 타이머 시작/중지
  useEffect(() => {
    if (!isActive) return;

    // 이미 시간이 0이면 onTimeUp 호출하고 종료
    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, handleTimeUp, timeLeft]);

  // 시간을 분:초 형식으로 변환
  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return {
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(remainingSeconds).padStart(2, '0')
    };
  }, []);

  // 타이머 색상 결정
  const getTimerColor = useCallback(() => {
    if (timeLeft <= 10) return 'text-red-500';
    if (timeLeft <= 30) return 'text-yellow-500';
    return 'text-green-500';
  }, [timeLeft]);

  // 프로그레스 바 진행률 계산
  const getProgressPercentage = useCallback(() => {
    if (duration === 0) return 0;
    return Math.min(((duration - timeLeft) / duration) * 100, 100);
  }, [duration, timeLeft]);

  // 상태 텍스트 결정
  const getStatusText = useCallback(() => {
    if (!isActive) return '대기 중';
    if (timeLeft <= 0) return '시간 종료';
    return '진행 중';
  }, [isActive, timeLeft]);

  const { minutes, seconds } = formatTime(timeLeft);
  const timerColor = getTimerColor();
  const progressPercentage = getProgressPercentage();
  const statusText = getStatusText();

  return (
    <div className={`flex flex-col items-center space-y-3 ${className}`}>
      {/* 시간 표시 */}
      <div className={`text-3xl font-bold transition-colors duration-300 ${timerColor}`}>
        {minutes}:{seconds}
      </div>
      
      {/* 프로그레스 바 */}
      <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700 overflow-hidden">
        <div 
          className={`h-3 rounded-full transition-all duration-1000 ease-out ${
            timeLeft <= 10 ? 'bg-red-500' : 
            timeLeft <= 30 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ 
            width: `${progressPercentage}%`,
            transition: 'width 1s ease-out, background-color 0.3s ease'
          }}
        />
      </div>
      
      {/* 상태 텍스트 */}
      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {statusText}
      </div>

      {/* 추가 정보 - 총 시간 표시 */}
      <div className="text-xs text-gray-500 dark:text-gray-500">
        총 {formatTime(duration).minutes}:{formatTime(duration).seconds}
      </div>
    </div>
  );
};

export default GameTimer;