import React from 'react';
import { 
  Mission, 
  MissionStatus, 
  MissionDifficulty, 
  MissionType,
  RewardType
} from '../types/mission.types';

interface MissionCardProps {
  mission: Mission;
  onClaim?: (missionId: string) => Promise<void>;
  onStart?: (missionId: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

/**
 * MissionCard 컴포넌트
 * - 개별 미션을 표시하는 카드 컴포넌트
 * - 미션 상태, 진행률, 보상 정보 표시
 * - 상태별 액션 버튼 제공 (시작/완료/수령)
 */
const MissionCard: React.FC<MissionCardProps> = ({
  mission,
  onClaim,
  onStart,
  isLoading = false,
  className = ""
}) => {
  // 난이도별 색상 반환
  const getDifficultyColor = (difficulty: MissionDifficulty): string => {
    switch (difficulty) {
      case MissionDifficulty.EASY:
        return 'bg-green-100 text-green-800 border-green-200';
      case MissionDifficulty.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case MissionDifficulty.HARD:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case MissionDifficulty.EXPERT:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // 상태별 색상 반환
  const getStatusColor = (status: MissionStatus): string => {
    switch (status) {
      case MissionStatus.LOCKED:
        return 'bg-gray-100 text-gray-600 border-gray-300';
      case MissionStatus.AVAILABLE:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case MissionStatus.IN_PROGRESS:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case MissionStatus.COMPLETED:
        return 'bg-green-100 text-green-800 border-green-200';
      case MissionStatus.CLAIMED:
        return 'bg-gray-100 text-gray-600 border-gray-300';
      case MissionStatus.EXPIRED:
        return 'bg-red-100 text-red-600 border-red-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  // 상태별 텍스트 반환
  const getStatusText = (status: MissionStatus): string => {
    switch (status) {
      case MissionStatus.LOCKED:
        return '잠김';
      case MissionStatus.AVAILABLE:
        return '수행 가능';
      case MissionStatus.IN_PROGRESS:
        return '진행 중';
      case MissionStatus.COMPLETED:
        return '완료';
      case MissionStatus.CLAIMED:
        return '보상 수령 완료';
      case MissionStatus.EXPIRED:
        return '기간 만료';
      default:
        return '알 수 없음';
    }
  };

  // 미션 타입별 아이콘 반환
  const getMissionIcon = (type: MissionType): string => {
    switch (type) {
      case MissionType.WALLET_INSTALL:
        return '👛';
      case MissionType.HOMEPAGE_VISIT:
        return '🏠';
      case MissionType.SOCIAL_FOLLOW:
        return '👥';
      case MissionType.GAME_PLAY:
        return '🎮';
      case MissionType.DAILY_LOGIN:
        return '📅';
      case MissionType.PREDICTION_CORRECT:
        return '🎯';
      case MissionType.RANKING_ACHIEVEMENT:
        return '🏆';
      case MissionType.CONSECUTIVE_WINS:
        return '🔥';
      case MissionType.TOTAL_SCORE:
        return '📊';
      case MissionType.ACCURACY_RATE:
        return '🎯';
      case MissionType.COMMUNITY_ENGAGEMENT:
        return '💬';
      default:
        return '📝';
    }
  };

  // 보상 아이콘 반환
  const getRewardIcon = (type: RewardType): string => {
    switch (type) {
      case RewardType.CTA:
        return '💰';
      case RewardType.POINTS:
        return '⭐';
      case RewardType.BADGE:
        return '🏅';
      case RewardType.NFT:
        return '🖼️';
      case RewardType.MULTIPLIER:
        return '⚡';
      default:
        return '🎁';
    }
  };

  // 보상 텍스트 반환
  const getRewardText = (reward: Mission['reward']): string => {
    switch (reward.type) {
      case RewardType.CTA:
        return `${reward.amount} CTA`;
      case RewardType.POINTS:
        return `${reward.amount} 포인트`;
      case RewardType.BADGE:
        return reward.badge || '배지';
      case RewardType.NFT:
        return 'NFT';
      case RewardType.MULTIPLIER:
        return `${reward.amount}x 배율`;
      default:
        return reward.description;
    }
  };

  // 액션 버튼 렌더링
  const renderActionButton = () => {
    if (mission.status === MissionStatus.LOCKED) {
      return (
        <button
          disabled
          className="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
        >
          조건 미충족
        </button>
      );
    }

    if (mission.status === MissionStatus.AVAILABLE && onStart) {
      return (
        <button
          onClick={() => onStart(mission.id)}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '처리 중...' : '시작하기'}
        </button>
      );
    }

    if (mission.status === MissionStatus.COMPLETED && onClaim) {
      return (
        <button
          onClick={() => onClaim(mission.id)}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '처리 중...' : '보상 수령'}
        </button>
      );
    }

    if (mission.status === MissionStatus.IN_PROGRESS) {
      return (
        <button
          disabled
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg cursor-not-allowed"
        >
          진행 중...
        </button>
      );
    }

    if (mission.status === MissionStatus.CLAIMED) {
      return (
        <button
          disabled
          className="w-full px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
        >
          수령 완료
        </button>
      );
    }

    if (mission.status === MissionStatus.EXPIRED) {
      return (
        <button
          disabled
          className="w-full px-4 py-2 bg-red-400 text-white rounded-lg cursor-not-allowed"
        >
          기간 만료
        </button>
      );
    }

    return null;
  };

  // 진행률 바 렌더링
  const renderProgressBar = () => {
    if (mission.status === MissionStatus.LOCKED || mission.status === MissionStatus.AVAILABLE) {
      return null;
    }

    const progressPercent = mission.maxProgress
      ? Math.round((mission.currentProgress / mission.maxProgress) * 100)
      : 0;

    return (
      <div className="mt-3">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>진행률</span>
          <span>{mission.currentProgress}/{mission.maxProgress}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    );
  };

  // 난이도별 텍스트 반환
  const getDifficultyText = (difficulty: MissionDifficulty): string => {
    switch (difficulty) {
      case MissionDifficulty.EASY:
        return '쉬움';
      case MissionDifficulty.MEDIUM:
        return '보통';
      case MissionDifficulty.HARD:
        return '어려움';
      case MissionDifficulty.EXPERT:
        return '전문가';
      default:
        return difficulty;
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow 
                  duration-300 border border-gray-200 overflow-hidden ${className}`}
    >
      {/* 헤더 섹션 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getMissionIcon(mission.type)}</span>
            <h3 className="font-semibold text-gray-900 truncate">{mission.title}</h3>
          </div>
          <div className="flex space-x-2">
            {/* 난이도 배지 */}
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(mission.difficulty)}`}>
              {getDifficultyText(mission.difficulty)}
            </span>
            {/* 상태 배지 */}
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(mission.status)}`}>
              {getStatusText(mission.status)}
            </span>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 line-clamp-2">{mission.description}</p>
      </div>

      {/* 본문 섹션 */}
      <div className="p-4">
        {/* 보상 정보 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getRewardIcon(mission.reward.type)}</span>
            <span className="text-sm font-medium text-gray-700">
              {getRewardText(mission.reward)}
            </span>
          </div>
          {mission.estimatedTime > 0 && (
            <span className="text-xs text-gray-500">
              예상 {mission.estimatedTime}분
            </span>
          )}
        </div>

        {/* 진행률 바 */}
        {renderProgressBar()}

        {/* 미션 요구사항 (간단한 표시) */}
        {mission.requirements?.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-medium text-gray-700 mb-1">요구사항</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              {mission.requirements.slice(0, 2).map((req, index) => (
                <li key={index} className="flex items-center space-x-1">
                  <span className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
                  <span className="truncate">{req.description}</span>
                </li>
              ))}
              {mission.requirements.length > 2 && (
                <li className="text-xs text-gray-500">
                  +{mission.requirements.length - 2}개 더...
                </li>
              )}
            </ul>
          </div>
        )}

        {/* 데일리/위클리/먼썰리 태그 */}
        <div className="flex space-x-2 mt-3">
          {mission.isDaily && (
            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium">
              일일
            </span>
          )}
          {mission.isWeekly && (
            <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-xs font-medium">
              주간
            </span>
          )}
          {mission.isMonthly && (
            <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-xs font-medium">
              월간
            </span>
          )}
          {mission.isSpecial && (
            <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-medium">
              특별
            </span>
          )}
        </div>

        {/* 카테고리 정보 */}
        <div className="mt-2">
          <span className="text-xs text-gray-500">
            카테고리: {mission.category}
          </span>
        </div>
      </div>

      {/* 액션 버튼 섹션 */}
      <div className="p-4 pt-0">
        {renderActionButton()}
      </div>
    </div>
  );
};

export default MissionCard;