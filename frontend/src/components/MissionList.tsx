import React, { useState, useEffect, useMemo } from 'react';
import MissionCard from './MissionCard';
import {
  Mission,
  MissionFilter,
  MissionStatus,
  MissionType,
  MissionDifficulty,
  MissionCategory,
  MissionCategoryInfo
} from '../types/mission.types';

interface MissionListProps {
  missions: Mission[];
  categories?: MissionCategoryInfo[];
  onMissionClaim?: (missionId: string) => Promise<void>;
  onMissionStart?: (missionId: string) => Promise<void>;
  isLoading?: boolean;
  showFilters?: boolean;
  showSearch?: boolean;
  showCategories?: boolean;
  className?: string;
}

/**
 * MissionList 컴포넌트
 * - 미션 목록을 표시하고 관리하는 컴포넌트
 * - 검색, 필터링, 정렬 기능 제공
 * - 그리드/리스트 뷰 모드 지원
 * - 미션 통계 및 상태별 분류 표시
 */
const MissionList: React.FC<MissionListProps> = ({
  missions,
  categories = [],
  onMissionClaim,
  onMissionStart,
  isLoading = false,
  showFilters = true,
  showSearch = true,
  showCategories = true,
  className = ""
}) => {
  // 상태 관리
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filter, setFilter] = useState<MissionFilter>({});
  const [sortBy, setSortBy] = useState<'createdAt' | 'difficulty' | 'reward' | 'progress' | 'deadline'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 필터링된 미션 계산
  const filteredMissions = useMemo(() => {
    let filtered = [...missions];

    // 텍스트 검색
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(mission => 
        mission.title.toLowerCase().includes(query) ||
        mission.description.toLowerCase().includes(query) ||
        (mission.category?.toLowerCase() ?? '').includes(query) ||
        (mission.tags?.some(tag => tag.toLowerCase().includes(query)) ?? false)
      );
    }

    // 카테고리 필터
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(mission => mission.category === selectedCategory);
    }

    // 상태 필터
    if (filter.status && filter.status.length > 0) {
      filtered = filtered.filter(mission => filter.status!.includes(mission.status));
    }

    // 타입 필터
    if (filter.type && filter.type.length > 0) {
      filtered = filtered.filter(mission => filter.type!.includes(mission.type));
    }

    // 난이도 필터
    if (filter.difficulty && filter.difficulty.length > 0) {
      filtered = filtered.filter(mission => filter.difficulty!.includes(mission.difficulty));
    }

    // 카테고리 필터
    if (filter.category && filter.category.length > 0) {
      filtered = filtered.filter(mission => filter.category!.includes(mission.category));
    }

    // 데일리/위클리/먼슬리 필터
    if (filter.isDaily !== undefined) {
      filtered = filtered.filter(mission => mission.isDaily === filter.isDaily);
    }
    if (filter.isWeekly !== undefined) {
      filtered = filtered.filter(mission => mission.isWeekly === filter.isWeekly);
    }
    if (filter.isMonthly !== undefined) {
      filtered = filtered.filter(mission => mission.isMonthly === filter.isMonthly);
    }
    if (filter.isSpecial !== undefined) {
      filtered = filtered.filter(mission => mission.isSpecial === filter.isSpecial);
    }

    // 수행 가능한 미션만 필터
    if (filter.available) {
      filtered = filtered.filter(mission => 
        mission.status === MissionStatus.AVAILABLE || 
        mission.status === MissionStatus.IN_PROGRESS ||
        mission.status === MissionStatus.COMPLETED
      );
    }

    // 보상이 있는 미션만 필터
    if (filter.hasRewards) {
      filtered = filtered.filter(mission => mission.reward.amount > 0);
    }

    // 태그 필터
    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter(mission => 
        filter.tags!.some(tag => mission.tags.includes(tag))
      );
    }

    // 정렬
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      if (sortBy === 'difficulty') {
        const difficultyOrder = {
          [MissionDifficulty.EASY]: 1,
          [MissionDifficulty.MEDIUM]: 2,
          [MissionDifficulty.HARD]: 3,
          [MissionDifficulty.EXPERT]: 4
        };
        aValue = difficultyOrder[a.difficulty];
        bValue = difficultyOrder[b.difficulty];
      } else if (sortBy === 'reward') {
        aValue = a.reward.amount;
        bValue = b.reward.amount;
      } else if (sortBy === 'createdAt') {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
      } else if (sortBy === 'deadline') {
        aValue = a.endDate ? new Date(a.endDate).getTime() : Infinity;
        bValue = b.endDate ? new Date(b.endDate).getTime() : Infinity;
      } else if (sortBy === 'progress') {
        aValue = a.progress ?? 0;
        bValue = b.progress ?? 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [missions, searchQuery, selectedCategory, filter, sortBy, sortOrder]);

  // 미션 통계 계산
  const stats = useMemo(() => {
    const total = missions.length;
    const completed = missions.filter(m => m.status === MissionStatus.COMPLETED || m.status === MissionStatus.CLAIMED).length;
    const available = missions.filter(m => m.status === MissionStatus.AVAILABLE).length;
    const inProgress = missions.filter(m => m.status === MissionStatus.IN_PROGRESS).length;
    const expired = missions.filter(m => m.status === MissionStatus.EXPIRED).length;
    
    return { total, completed, available, inProgress, expired };
  }, [missions]);

  // 필터 상태 업데이트 함수들
  const updateFilter = (key: keyof MissionFilter, value: any) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilter({});
    setSelectedCategory('all');
    setSearchQuery('');
  };

  // 상태별 색상 반환
  const getStatusColor = (status: MissionStatus): string => {
    switch (status) {
      case MissionStatus.AVAILABLE: return 'text-blue-600';
      case MissionStatus.IN_PROGRESS: return 'text-purple-600';
      case MissionStatus.COMPLETED: return 'text-green-600';
      case MissionStatus.CLAIMED: return 'text-gray-600';
      case MissionStatus.EXPIRED: return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  // 상태별 한글 텍스트 반환
  const getStatusText = (status: MissionStatus): string => {
    switch (status) {
      case MissionStatus.LOCKED: return '잠김';
      case MissionStatus.AVAILABLE: return '수행 가능';
      case MissionStatus.IN_PROGRESS: return '진행 중';
      case MissionStatus.COMPLETED: return '완료';
      case MissionStatus.CLAIMED: return '수령 완료';
      case MissionStatus.EXPIRED: return '기간 만료';
      default: return status;
    }
  };

  // 난이도별 한글 텍스트 반환
  const getDifficultyText = (difficulty: MissionDifficulty): string => {
    switch (difficulty) {
      case MissionDifficulty.EASY: return '쉬움';
      case MissionDifficulty.MEDIUM: return '보통';
      case MissionDifficulty.HARD: return '어려움';
      case MissionDifficulty.EXPERT: return '전문가';
      default: return difficulty;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 헤더 및 통계 */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">미션 목록</h2>
          <div className="flex items-center space-x-4">
            {/* 뷰 모드 토글 */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🔲 그리드
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📋 리스트
              </button>
            </div>
          </div>
        </div>

        {/* 미션 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">전체 미션</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className={`text-2xl font-bold ${getStatusColor(MissionStatus.AVAILABLE)}`}>
              {stats.available}
            </div>
            <div className="text-sm text-gray-600">수행 가능</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className={`text-2xl font-bold ${getStatusColor(MissionStatus.IN_PROGRESS)}`}>
              {stats.inProgress}
            </div>
            <div className="text-sm text-gray-600">진행 중</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className={`text-2xl font-bold ${getStatusColor(MissionStatus.COMPLETED)}`}>
              {stats.completed}
            </div>
            <div className="text-sm text-gray-600">완료됨</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className={`text-2xl font-bold ${getStatusColor(MissionStatus.EXPIRED)}`}>
              {stats.expired}
            </div>
            <div className="text-sm text-gray-600">만료됨</div>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      {(showSearch || showFilters || showCategories) && (
        <div className="bg-white rounded-lg p-6 shadow-sm space-y-4">
          {/* 검색바 */}
          {showSearch && (
            <div className="relative">
              <input
                type="text"
                placeholder="미션 제목, 설명, 카테고리 또는 태그로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
            </div>
          )}

          {/* 카테고리 탭 */}
          {showCategories && categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                전체 ({missions.length})
              </button>
              {categories.map(category => {
                const categoryMissions = missions.filter(m => m.category === category.id);
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.icon} {category.name} ({categoryMissions.length})
                  </button>
                );
              })}
            </div>
          )}

          {/* 필터 옵션 */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 상태 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
                <select
                  multiple
                  value={filter.status || []}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value) as MissionStatus[];
                    updateFilter('status', values);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  size={3}
                >
                  {Object.values(MissionStatus).map(status => (
                    <option key={status} value={status}>
                      {getStatusText(status)}
                    </option>
                  ))}
                </select>
              </div>

              {/* 난이도 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">난이도</label>
                <select
                  multiple
                  value={filter.difficulty || []}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value) as MissionDifficulty[];
                    updateFilter('difficulty', values);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  size={3}
                >
                  {Object.values(MissionDifficulty).map(difficulty => (
                    <option key={difficulty} value={difficulty}>
                      {getDifficultyText(difficulty)}
                    </option>
                  ))}
                </select>
              </div>

              {/* 정렬 옵션 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">정렬</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="createdAt">생성일</option>
                  <option value="difficulty">난이도</option>
                  <option value="reward">보상</option>
                  <option value="progress">진행률</option>
                  <option value="deadline">마감일</option>
                </select>
              </div>

              {/* 정렬 순서 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">순서</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="desc">내림차순</option>
                  <option value="asc">오름차순</option>
                </select>
              </div>
            </div>
          )}

          {/* 빠른 필터 버튼 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updateFilter('available', !filter.available)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter.available
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              수행 가능만
            </button>
            <button
              onClick={() => updateFilter('isDaily', filter.isDaily === true ? undefined : true)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter.isDaily
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              데일리 미션
            </button>
            <button
              onClick={() => updateFilter('isWeekly', filter.isWeekly === true ? undefined : true)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter.isWeekly
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              주간 미션
            </button>
            <button
              onClick={() => updateFilter('isMonthly', filter.isMonthly === true ? undefined : true)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter.isMonthly
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              월간 미션
            </button>
            <button
              onClick={() => updateFilter('hasRewards', !filter.hasRewards)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter.hasRewards
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              보상 있는 미션
            </button>
            <button
              onClick={clearFilters}
              className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              필터 초기화
            </button>
          </div>
        </div>
      )}

      {/* 미션 목록 */}
      <div className="space-y-4">
        {/* 결과 헤더 */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {filteredMissions.length}개의 미션을 찾았습니다
            {searchQuery && <span> (검색: "{searchQuery}")</span>}
          </div>
        </div>

        {/* 미션 카드들 */}
        {filteredMissions.length > 0 ? (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }>
            {filteredMissions.map(mission => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onClaim={onMissionClaim}
                onStart={onMissionStart}
                isLoading={isLoading}
                className={viewMode === 'list' ? 'max-w-none' : ''}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              조건에 맞는 미션이 없습니다
            </h3>
            <p className="text-gray-600 mb-4">
              다른 검색어나 필터를 시도해보세요
            </p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              모든 미션 보기
            </button>
          </div>
        )}
      </div>

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-gray-900">미션을 처리하는 중...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionList;