import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWeb3Auth } from '../providers/Web3AuthProvider';
import MissionList from '../components/MissionList';
import missionService from '../services/missionService';
import {
  Mission,
  MissionListResponse,
  MissionCategory,
  MissionCategoryInfo,
  MissionStatus,
  MissionType,
  UserMissionStats,
  MissionClaimResponse,
  MissionStartResponse,
  MissionProgressUpdateResponse
} from '../types/mission.types';

interface MissionPageState {
  missions: Mission[];
  categories: MissionCategoryInfo[];
  userStats: UserMissionStats | null;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface GameAccessInfo {
  canPlayGame: boolean;
  requiredMissions: Mission[];
  completedRequiredMissions: Mission[];
  nextMission?: Mission;
  progressPercentage: number;
}

/**
 * MissionPage 컴포넌트
 * - 사용자 미션 목록 및 진행 현황 표시
 * - 미션 시작, 진행, 완료, 보상 수령 기능
 * - 게임 접근 권한 관리
 * - 실시간 미션 상태 업데이트
 */
const MissionPage: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, user } = useWeb3Auth();

  // 상태 관리
  const [state, setState] = useState<MissionPageState>({
    missions: [],
    categories: [],
    userStats: null,
    isLoading: true,
    isProcessing: false,
    error: null,
    lastUpdated: null
  });

  // 게임 접근 권한 계산
  const gameAccessInfo: GameAccessInfo = React.useMemo(() => {
    const requiredMissions = state.missions.filter(
      mission => mission.category === MissionCategory.ONBOARDING
    );
    
    const completedRequiredMissions = requiredMissions.filter(
      mission => mission.status === MissionStatus.COMPLETED || mission.status === MissionStatus.CLAIMED
    );

    const canPlayGame = requiredMissions.length > 0 && 
                       completedRequiredMissions.length === requiredMissions.length;

    const nextMission = state.missions.find(
      mission => mission.status === MissionStatus.AVAILABLE
    );

    const progressPercentage = requiredMissions.length > 0 
      ? (completedRequiredMissions.length / requiredMissions.length) * 100 
      : 0;

    return {
      canPlayGame,
      requiredMissions,
      completedRequiredMissions,
      nextMission,
      progressPercentage
    };
  }, [state.missions]);

  // 에러 처리 헬퍼
  const handleError = useCallback((error: any, context: string) => {
    console.error(`${context} 오류:`, error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
    setState(prev => ({ ...prev, error: `${context}: ${errorMessage}`, isLoading: false }));
  }, []);

  // 성공 메시지 표시 헬퍼
  const showSuccess = useCallback((message: string) => {
    // 실제로는 toast 라이브러리를 사용하거나 별도 알림 시스템 구현
    alert(`✅ ${message}`);
  }, []);

  // 미션 데이터 로드
  const loadMissions = useCallback(async () => {
    if (!isConnected || !user) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 사용자 미션 목록 조회
      const missionResponse: MissionListResponse = await missionService.getUserMissions(
        user.verifierId || user.email || 'unknown-user',
        {
          sortBy: 'createdAt',
          sortOrder: 'desc',
          limit: 50
        }
      );

      // 미션 카테고리 정보 조회
      const categories: MissionCategory[] = await missionService.getMissionCategories();
      
      // 사용자 미션 통계 조회
      const userStats: UserMissionStats = await missionService.getMissionStats(
        user.verifierId || user.email || 'unknown-user'
      );

      // 카테고리 정보를 MissionCategoryInfo 형태로 변환
      const categoryInfos: MissionCategoryInfo[] = categories.map(categoryId => {
        const categoryMissions = missionResponse.missions.filter(m => m.category === categoryId);
        const completedMissions = categoryMissions.filter(
          m => m.status === MissionStatus.COMPLETED || m.status === MissionStatus.CLAIMED
        );

        return {
          id: categoryId,
          name: getCategoryName(categoryId),
          description: getCategoryDescription(categoryId),
          icon: getCategoryIcon(categoryId),
          color: getCategoryColor(categoryId),
          missions: categoryMissions,
          totalMissions: categoryMissions.length,
          completedMissions: completedMissions.length,
          totalRewards: categoryMissions.reduce((sum, m) => sum + m.reward.amount, 0)
        };
      });

      setState(prev => ({
        ...prev,
        missions: missionResponse.missions,
        categories: categoryInfos,
        userStats,
        isLoading: false,
        lastUpdated: new Date()
      }));

    } catch (error) {
      handleError(error, '미션 데이터 로드');
    }
  }, [isConnected, user, handleError]);

  // 미션 시작
  const handleMissionStart = useCallback(async (missionId: string) => {
    if (!user || state.isProcessing) return;
    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const response = await missionService.startMission(
        missionId,
        user.verifierId || user.email || 'unknown-user'
      );
      if (response.success) {
        setState(prev => ({
          ...prev,
          missions: prev.missions.map(mission =>
            mission.id === missionId
              ? { ...mission, status: MissionStatus.IN_PROGRESS }
              : mission
          )
        }));
        showSuccess(`미션 "${response.mission.title}"을(를) 시작했습니다!`);
        await executeMissionAction(response.mission);
      }
    } catch (error) {
      handleError(error, '미션 시작');
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [user, state.isProcessing, handleError, showSuccess, executeMissionAction]);

  // 미션 보상 수령
  const handleMissionClaim = useCallback(async (missionId: string) => {
    if (!user || state.isProcessing) return;

    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const response: MissionClaimResponse = await missionService.claimMissionReward(
        missionId,
        {
          missionId,
          userId: user.verifierId || user.email || 'unknown-user'
        }
      );

      if (response.success) {
        // 미션 상태 업데이트
        setState(prev => ({
          ...prev,
          missions: prev.missions.map(mission =>
            mission.id === missionId
              ? { ...mission, status: MissionStatus.CLAIMED }
              : mission
          ),
          isProcessing: false
        }));

        showSuccess(`보상을 수령했습니다! ${response.reward.description}`);

        // 통계 재로드
        await loadUserStats();
      }
    } catch (error) {
      handleError(error, '보상 수령');
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [user, state.isProcessing, handleError, showSuccess]);

  // 사용자 통계 재로드
  const loadUserStats = useCallback(async () => {
    if (!user) return;

    try {
      const userStats = await missionService.getMissionStats(
        user.verifierId || user.email || 'unknown-user'
      );
      setState(prev => ({ ...prev, userStats }));
    } catch (error) {
      console.error('사용자 통계 로드 실패:', error);
    }
  }, [user]);

  // 미션 액션 실행
  const executeMissionAction = useCallback(async (mission: Mission) => {
    if (!user) return;

    const userId = user.verifierId || user.email || 'unknown-user';

    try {
      let response: MissionProgressUpdateResponse;

      switch (mission.type) {
        case MissionType.WALLET_INSTALL:
          // 지갑 설치 페이지로 이동
          window.open('https://play.google.com/store/apps/details?id=com.creatachain.wallet', '_blank');
          // 사용자가 설치 후 수동으로 확인하도록 안내
          break;

        case MissionType.HOMEPAGE_VISIT:
          // 홈페이지 방문
          window.open('https://creatachain.com/ourstory', '_blank');
          // 일정 시간 후 자동 검증
          setTimeout(async () => {
            try {
              await missionService.verifyHomepageVisit(userId, Date.now());
              await loadMissions(); // 미션 상태 재로드
            } catch (error) {
              console.error('홈페이지 방문 검증 실패:', error);
            }
          }, 5000);
          break;

        case MissionType.SOCIAL_FOLLOW:
          // 소셜 팔로우 페이지로 이동
          window.open('https://twitter.com/creatachain', '_blank');
          break;

        case MissionType.DAILY_LOGIN:
          // 일일 로그인 자동 처리
          response = await missionService.recordDailyLogin(userId);
          if (response.success) {
            await loadMissions();
          }
          break;

        case MissionType.GAME_PLAY:
          // 게임 페이지로 이동
          navigate('/game?tutorial=true');
          break;

        default:
          console.log(`미션 타입 ${mission.type}에 대한 액션이 정의되지 않았습니다.`);
      }
    } catch (error) {
      console.error('미션 액션 실행 실패:', error);
    }
  }, [user, navigate, loadMissions]);

  // 수동 미션 검증
  const handleManualVerification = useCallback(async (missionId: string, missionType: MissionType) => {
    if (!user || state.isProcessing) return;

    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      const userId = user.verifierId || user.email || 'unknown-user';
      
      let response: MissionProgressUpdateResponse;

      switch (missionType) {
        case MissionType.WALLET_INSTALL:
          response = await missionService.verifyWalletInstallation(userId, 'wallet-address-placeholder');
          break;
        case MissionType.SOCIAL_FOLLOW:
          response = await missionService.verifySocialFollow(userId, 'twitter', user.name || 'unknown');
          break;
        default:
          throw new Error('지원되지 않는 검증 타입입니다.');
      }

      if (response.success) {
        showSuccess('미션이 확인되었습니다!');
        await loadMissions();
      }
    } catch (error) {
      handleError(error, '미션 검증');
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [user, state.isProcessing, handleError, showSuccess, loadMissions]);

  // 카테고리 정보 헬퍼 함수들
  const getCategoryName = (category: MissionCategory): string => {
    const names = {
      [MissionCategory.ONBOARDING]: '온보딩',
      [MissionCategory.DAILY]: '일일 미션',
      [MissionCategory.WEEKLY]: '주간 미션',
      [MissionCategory.MONTHLY]: '월간 미션',
      [MissionCategory.SPECIAL]: '특별 미션',
      [MissionCategory.ACHIEVEMENT]: '업적',
      [MissionCategory.SOCIAL]: '소셜',
      [MissionCategory.GAMEPLAY]: '게임플레이'
    };
    return names[category] || category;
  };

  const getCategoryDescription = (category: MissionCategory): string => {
    const descriptions = {
      [MissionCategory.ONBOARDING]: '새로운 사용자를 위한 필수 미션',
      [MissionCategory.DAILY]: '매일 새롭게 갱신되는 미션',
      [MissionCategory.WEEKLY]: '주간 단위로 진행되는 미션',
      [MissionCategory.MONTHLY]: '월간 단위로 진행되는 미션',
      [MissionCategory.SPECIAL]: '특별 이벤트 미션',
      [MissionCategory.ACHIEVEMENT]: '특정 조건 달성 시 완료되는 미션',
      [MissionCategory.SOCIAL]: '소셜 활동 관련 미션',
      [MissionCategory.GAMEPLAY]: '게임 플레이 관련 미션'
    };
    return descriptions[category] || '미션 설명';
  };

  const getCategoryIcon = (category: MissionCategory): string => {
    const icons = {
      [MissionCategory.ONBOARDING]: '🚀',
      [MissionCategory.DAILY]: '📅',
      [MissionCategory.WEEKLY]: '📆',
      [MissionCategory.MONTHLY]: '🗓️',
      [MissionCategory.SPECIAL]: '⭐',
      [MissionCategory.ACHIEVEMENT]: '🏆',
      [MissionCategory.SOCIAL]: '👥',
      [MissionCategory.GAMEPLAY]: '🎮'
    };
    return icons[category] || '📝';
  };

  const getCategoryColor = (category: MissionCategory): string => {
    const colors = {
      [MissionCategory.ONBOARDING]: '#3B82F6',
      [MissionCategory.DAILY]: '#10B981',
      [MissionCategory.WEEKLY]: '#8B5CF6',
      [MissionCategory.MONTHLY]: '#F59E0B',
      [MissionCategory.SPECIAL]: '#EF4444',
      [MissionCategory.ACHIEVEMENT]: '#F59E0B',
      [MissionCategory.SOCIAL]: '#06B6D4',
      [MissionCategory.GAMEPLAY]: '#8B5CF6'
    };
    return colors[category] || '#6B7280';
  };

  // 페이지 새로고침 핸들러
  const handleRefresh = useCallback(() => {
    loadMissions();
  }, [loadMissions]);

  // 초기 데이터 로드
  useEffect(() => {
    if (isConnected && user) {
      loadMissions();
    }
  }, [isConnected, user, loadMissions]);

  // 주기적 데이터 갱신 (5분마다)
  useEffect(() => {
    if (!isConnected || !user) return;

    const interval = setInterval(() => {
      loadMissions();
    }, 5 * 60 * 1000); // 5분

    return () => clearInterval(interval);
  }, [isConnected, user, loadMissions]);

  // 로그인하지 않은 경우
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4 text-center">
          <div className="text-6xl mb-6">🔐</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-6">
            미션을 수행하고 CTA 토큰을 획득하려면 먼저 로그인해주세요.
          </p>
          <Link 
            to="/"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 
                     text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 
                     transition-all duration-300 transform hover:scale-105"
          >
            <span className="mr-2">🏠</span>
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // 로딩 중
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <div className="bg-gradient-to-r from-blue-900 to-purple-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">🎯 미션 센터</h1>
              <p className="text-xl text-blue-100">미션 데이터를 불러오는 중...</p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">미션 정보를 가져오고 있습니다...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 에러 발생
  if (state.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4 text-center">
          <div className="text-6xl mb-6">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-6">{state.error}</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg 
                     font-semibold hover:bg-blue-700 transition-colors mr-4"
          >
            <span className="mr-2">🔄</span>
            다시 시도
          </button>
          <Link 
            to="/"
            className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg 
                     font-semibold hover:bg-gray-700 transition-colors"
          >
            <span className="mr-2">🏠</span>
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-900 to-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">🎯 미션 센터</h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-6">
              간단한 미션을 완료하고 CTA 토큰을 획득하세요! 
              온보딩 미션을 모두 완료하면 게임에 참여할 수 있습니다.
            </p>
            {state.lastUpdated && (
              <p className="text-sm text-blue-200">
                마지막 업데이트: {state.lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 사용자 통계 및 게임 접근 정보 */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {state.userStats?.completedMissions || 0}/{state.userStats?.totalMissions || 0}
              </div>
              <div className="text-sm text-gray-600">완료된 미션</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {state.userStats?.totalCTA || 0}
              </div>
              <div className="text-sm text-gray-600">획득한 CTA</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {state.userStats?.currentStreak || 0}
              </div>
              <div className="text-sm text-gray-600">연속 일수</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-1">
                {gameAccessInfo.canPlayGame ? '🎮' : '🔒'}
              </div>
              <div className="text-sm text-gray-600">
                {gameAccessInfo.canPlayGame ? '게임 가능' : '게임 잠금'}
              </div>
            </div>
          </div>

          {/* 게임 접근 진행률 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">게임 접근 진행률</span>
              <span className="text-sm font-medium text-gray-700">
                {gameAccessInfo.completedRequiredMissions.length}/{gameAccessInfo.requiredMissions.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${gameAccessInfo.progressPercentage}%` }}
              />
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="text-center">
            {gameAccessInfo.canPlayGame ? (
              <div className="space-x-4">
                <Link to="/game">
                  <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 
                                   text-white rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 
                                   transition-all duration-300 transform hover:scale-105">
                    <span className="mr-2">🎮</span>
                    게임 시작하기
                  </button>
                </Link>
                <Link to="/ranking">
                  <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 
                                   text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 
                                   transition-all duration-300 transform hover:scale-105">
                    <span className="mr-2">🏆</span>
                    랭킹 확인하기
                  </button>
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">
                  온보딩 미션을 모두 완료하면 게임에 참여할 수 있습니다.
                </p>
                {gameAccessInfo.nextMission && (
                  <p className="text-blue-600 font-semibold">
                    다음 미션: {gameAccessInfo.nextMission.title}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 새로고침 버튼 */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">미션 목록</h2>
          <button
            onClick={handleRefresh}
            disabled={state.isProcessing}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg 
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="mr-2">🔄</span>
            새로고침
          </button>
        </div>

        {/* 미션 목록 컴포넌트 */}
        <MissionList
          missions={state.missions}
          categories={state.categories}
          onMissionClaim={handleMissionClaim}
          onMissionStart={handleMissionStart}
          isLoading={state.isProcessing}
          showFilters={true}
          showSearch={true}
          showCategories={true}
        />

        {/* 도움말 섹션 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">💡 미션 수행 가이드</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">🚀 온보딩 미션</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 지갑 설치: CreataChain 공식 지갑을 설치하세요</li>
                <li>• 홈페이지 방문: 공식 홈페이지를 방문하여 프로젝트를 알아보세요</li>
                <li>• 소셜 팔로우: 공식 소셜 미디어를 팔로우하세요</li>
                <li>• 모든 온보딩 미션 완료 시 게임 접근 권한이 부여됩니다</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">❓ 자주 묻는 질문</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• <strong>Q:</strong> 미션 완료가 확인되지 않아요</li>
                <li>• <strong>A:</strong> 수동 검증이 필요한 미션은 "완료 확인" 버튼을 클릭하세요</li>
                <li>• <strong>Q:</strong> 보상은 언제 받을 수 있나요?</li>
                <li>• <strong>A:</strong> 미션 완료 후 즉시 "보상 수령" 버튼을 클릭하여 받을 수 있습니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissionPage;