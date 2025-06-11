// CTA_Mission/frontend/src/pages/RankingPage.tsx
import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useWeb3Auth } from '../providers/Web3AuthProvider'

// 타입 정의
interface RankingUser {
  id: string
  rank: number
  nickname: string
  walletAddress: string
  totalScore: number
  gamesPlayed: number
  winRate: number
  streak: number
  lastActive: string
  rewardTier: number
  estimatedReward: string
  isCurrentUser?: boolean
}

interface RankingPeriod {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'active' | 'ended' | 'upcoming'
}

interface AirdropHistory {
  id: string
  period: string
  rank: number
  amount: string
  txHash?: string
  status: 'pending' | 'completed' | 'failed'
  date: string
}

interface UserStats {
  currentRank: number | null
  totalScore: number
  gamesPlayed: number
  winRate: number
  estimatedReward: string
  rewardTier: number
}

// 기본 UI 컴포넌트들
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300 ${className}`}>
    {children}
  </div>
)

const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
    {children}
  </div>
)

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>
    {children}
  </h3>
)

const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
)

const Button: React.FC<{
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
}> = ({ 
  children, 
  onClick, 
  disabled = false, 
  className = '', 
  variant = 'primary',
  size = 'default'
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg transform hover:scale-105',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
  }
  
  const sizeClasses = {
    sm: 'h-9 px-4 text-sm',
    default: 'h-11 px-6 text-base',
    lg: 'h-14 px-8 text-lg'
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </button>
  )
}

const Badge: React.FC<{
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'gold' | 'silver' | 'bronze'
  className?: string
}> = ({ children, variant = 'default', className = '' }) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    gold: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
    silver: 'bg-gradient-to-r from-gray-300 to-gray-500 text-white',
    bronze: 'bg-gradient-to-r from-orange-400 to-red-500 text-white'
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}

const RankingPage: React.FC = () => {
  const { isConnected, user } = useWeb3Auth()
  
  // 상태 관리
  const [currentPeriod, setCurrentPeriod] = useState<RankingPeriod>({
    id: 'week-24-2025',
    name: '2025년 24주차',
    startDate: '2025-06-01',
    endDate: '2025-06-07',
    status: 'active'
  })
  
  const [selectedTab, setSelectedTab] = useState<'ranking' | 'airdrop'>('ranking')
  const [selectedPeriodType, setSelectedPeriodType] = useState<'weekly' | 'monthly' | 'all'>('weekly')
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  
  const [rankings, setRankings] = useState<RankingUser[]>([])
  const [userStats, setUserStats] = useState<UserStats>({
    currentRank: null,
    totalScore: 0,
    gamesPlayed: 0,
    winRate: 0,
    estimatedReward: '0 CTA',
    rewardTier: 0
  })
  const [airdropHistory, setAirdropHistory] = useState<AirdropHistory[]>([])

  // Mock 데이터 생성
  const generateMockRankings = useCallback(() => {
    const mockUsers: RankingUser[] = []
    const usernames = [
      'CryptoMaster', 'PredictionKing', 'GamePro123', 'CTA_Fan', 'CryptoNinja',
      'BlockchainBoss', 'TokenHunter', 'PriceProphet', 'ChartWhiz', 'CoinSage',
      'DigitalDragon', 'CryptoWolf', 'BitBeast', 'EtherEagle', 'AltcoinAce',
      'DefiDynamo', 'NFTNinja', 'CryptoChamp', 'TokenTitan', 'CoinCrusader'
    ]

    for (let i = 0; i < 100; i++) {
      const isCurrentUser = user && i === 15 // 현재 사용자를 16위로 설정
      const score = Math.max(100, 3000 - (i * 25) + Math.floor(Math.random() * 200))
      const gamesPlayed = Math.floor(Math.random() * 50) + 10
      const winRate = Math.max(30, 85 - (i * 0.5) + Math.floor(Math.random() * 10))
      
      let rewardTier = 0
      let estimatedReward = '0 CTA'
      
      if (i === 0) {
        rewardTier = 1
        estimatedReward = '10,000 CTA'
      } else if (i < 50) {
        rewardTier = 2
        estimatedReward = '1,000 CTA'
      } else if (i < 550) {
        rewardTier = 3
        estimatedReward = '100 CTA'
      } else if (i < 1550) {
        rewardTier = 4
        estimatedReward = '10 CTA'
      }

      mockUsers.push({
        id: `user-${i + 1}`,
        rank: i + 1,
        nickname: isCurrentUser ? (user.name || user.email || 'You') : usernames[i % usernames.length] + (i > 19 ? `${Math.floor(i / 20)}` : ''),
        walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
        totalScore: score,
        gamesPlayed,
        winRate,
        streak: Math.floor(Math.random() * 10),
        lastActive: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString(),
        rewardTier,
        estimatedReward,
        isCurrentUser
      })
    }

    return mockUsers
  }, [user])

  // Mock 에어드롭 히스토리 생성
  const generateMockAirdropHistory = useCallback((): AirdropHistory[] => {
    return [
      {
        id: 'airdrop-1',
        period: '2025년 23주차',
        rank: 18,
        amount: '100 CTA',
        txHash: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'completed',
        date: '2025-05-31'
      },
      {
        id: 'airdrop-2',
        period: '2025년 22주차',
        rank: 25,
        amount: '100 CTA',
        txHash: '0xabcdef1234567890abcdef1234567890abcdef12',
        status: 'completed',
        date: '2025-05-24'
      },
      {
        id: 'airdrop-3',
        period: '2025년 21주차',
        rank: 42,
        amount: '100 CTA',
        status: 'pending',
        date: '2025-05-17'
      }
    ]
  }, [])

  // 데이터 로드
  const loadRankingData = useCallback(async () => {
    setIsLoading(true)
    try {
      // 실제로는 API 호출
      // const response = await fetch(`/api/ranking/${selectedPeriodType}`)
      // const data = await response.json()
      
      // Mock 데이터 사용
      await new Promise(resolve => setTimeout(resolve, 1000)) // 로딩 시뮬레이션
      
      const mockRankings = generateMockRankings()
      setRankings(mockRankings.slice(0, 50)) // 상위 50명만 표시
      
      // 현재 사용자 통계 설정
      const currentUser = mockRankings.find(u => u.isCurrentUser)
      if (currentUser) {
        setUserStats({
          currentRank: currentUser.rank,
          totalScore: currentUser.totalScore,
          gamesPlayed: currentUser.gamesPlayed,
          winRate: currentUser.winRate,
          estimatedReward: currentUser.estimatedReward,
          rewardTier: currentUser.rewardTier
        })
      }
      
      setLastUpdated(new Date())
    } catch (error) {
      console.error('랭킹 데이터 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedPeriodType, generateMockRankings])

  // 에어드롭 히스토리 로드
  const loadAirdropHistory = useCallback(async () => {
    setIsLoading(true)
    try {
      // 실제로는 API 호출
      // const response = await fetch('/api/airdrop/history')
      // const data = await response.json()
      
      // Mock 데이터 사용
      await new Promise(resolve => setTimeout(resolve, 800))
      
      setAirdropHistory(generateMockAirdropHistory())
    } catch (error) {
      console.error('에어드롭 히스토리 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }, [generateMockAirdropHistory])

  // 초기 데이터 로드
  useEffect(() => {
    if (selectedTab === 'ranking') {
      loadRankingData()
    } else {
      loadAirdropHistory()
    }
  }, [selectedTab, selectedPeriodType, loadRankingData, loadAirdropHistory])

  // 실시간 업데이트 (30초마다)
  useEffect(() => {
    if (selectedTab === 'ranking') {
      const interval = setInterval(() => {
        loadRankingData()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [selectedTab, loadRankingData])

  // 랭킹 아이콘 헬퍼
  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    if (rank <= 10) return '🏅'
    return `#${rank}`
  }

  // 보상 등급 색상 헬퍼
  const getRewardTierColor = (tier: number) => {
    switch (tier) {
      case 1: return 'text-yellow-600 bg-yellow-50'
      case 2: return 'text-gray-600 bg-gray-50'
      case 3: return 'text-orange-600 bg-orange-50'
      case 4: return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-400 bg-gray-50'
    }
  }

  // 트랜잭션 해시 줄이기
  const shortenTxHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-900 to-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              🏆 랭킹 리더보드
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              실시간 업데이트되는 글로벌 랭킹에서 당신의 위치를 확인하고 CTA 보상을 받으세요!
            </p>
            <div className="mt-4 text-blue-200 text-sm">
              마지막 업데이트: {lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 탭 네비게이션 */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-lg">
            <button
              onClick={() => setSelectedTab('ranking')}
              className={`px-6 py-3 rounded-md font-semibold transition-all ${
                selectedTab === 'ranking'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 실시간 랭킹
            </button>
            <button
              onClick={() => setSelectedTab('airdrop')}
              className={`px-6 py-3 rounded-md font-semibold transition-all ${
                selectedTab === 'airdrop'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🪙 에어드롭 내역
            </button>
          </div>
        </div>

        {selectedTab === 'ranking' && (
          <>
            {/* 내 랭킹 카드 */}
            {isConnected && (
              <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-center">내 랭킹 정보</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-1">
                        {userStats.currentRank || '-'}
                      </div>
                      <div className="text-sm text-gray-600">현재 순위</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-1">
                        {userStats.totalScore.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">총 점수</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-1">
                        {userStats.gamesPlayed}
                      </div>
                      <div className="text-sm text-gray-600">게임 수</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600 mb-1">
                        {userStats.winRate}%
                      </div>
                      <div className="text-sm text-gray-600">승률</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-600 mb-1">
                        {userStats.estimatedReward}
                      </div>
                      <div className="text-sm text-gray-600">예상 보상</div>
                      {userStats.rewardTier > 0 && (
                        <Badge variant={userStats.rewardTier === 1 ? 'gold' : userStats.rewardTier === 2 ? 'silver' : 'bronze'} className="mt-1">
                          {userStats.rewardTier}등급
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 기간 선택 */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
              <div className="flex space-x-2 mb-4 sm:mb-0">
                {[
                  { key: 'weekly', label: '주간 랭킹' },
                  { key: 'monthly', label: '월간 랭킹' },
                  { key: 'all', label: '전체 랭킹' }
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={selectedPeriodType === key ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriodType(key as 'weekly' | 'monthly' | 'all')}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              
              <div className="text-sm text-gray-600">
                {currentPeriod.name} ({currentPeriod.startDate} ~ {currentPeriod.endDate})
                <Badge variant="success" className="ml-2">진행중</Badge>
              </div>
            </div>

            {/* 보상 구조 */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-center">🎁 보상 구조</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-4xl mb-2">🥇</div>
                    <div className="font-bold text-yellow-600">1등</div>
                    <div className="text-2xl font-bold text-yellow-600">10,000 CTA</div>
                    <div className="text-sm text-gray-600">1명</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-4xl mb-2">🥈</div>
                    <div className="font-bold text-gray-600">2등</div>
                    <div className="text-2xl font-bold text-gray-600">1,000 CTA</div>
                    <div className="text-sm text-gray-600">50명</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-4xl mb-2">🥉</div>
                    <div className="font-bold text-orange-600">3등</div>
                    <div className="text-2xl font-bold text-orange-600">100 CTA</div>
                    <div className="text-sm text-gray-600">500명</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-4xl mb-2">🏅</div>
                    <div className="font-bold text-blue-600">4등</div>
                    <div className="text-2xl font-bold text-blue-600">10 CTA</div>
                    <div className="text-sm text-gray-600">1000명</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 랭킹 테이블 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>🏆 리더보드</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadRankingData}
                  disabled={isLoading}
                >
                  {isLoading ? '🔄 로딩중...' : '🔄 새로고침'}
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">순위</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">플레이어</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">점수</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">게임수</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">승률</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연승</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">예상 보상</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {isLoading ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center">
                            <div className="text-4xl mb-4">⏳</div>
                            <div className="text-gray-500">랭킹 데이터를 불러오는 중...</div>
                          </td>
                        </tr>
                      ) : (
                        rankings.map((ranking) => (
                          <tr 
                            key={ranking.id} 
                            className={`hover:bg-gray-50 transition-colors ${
                              ranking.isCurrentUser ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="text-2xl mr-2">{getRankIcon(ranking.rank)}</span>
                                <span className="font-medium text-gray-900">
                                  {ranking.rank}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {ranking.nickname}
                                  {ranking.isCurrentUser && (
                                    <Badge variant="success" className="ml-2">나</Badge>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {ranking.walletAddress.slice(0, 6)}...{ranking.walletAddress.slice(-4)}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              {ranking.totalScore.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {ranking.gamesPlayed}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {ranking.winRate}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {ranking.streak > 0 ? `🔥 ${ranking.streak}` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant={ranking.rewardTier === 1 ? 'gold' : ranking.rewardTier === 2 ? 'silver' : ranking.rewardTier === 3 ? 'bronze' : 'default'}>
                                {ranking.estimatedReward}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {selectedTab === 'airdrop' && (
          <>
            {/* 에어드롭 통계 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {airdropHistory.filter(h => h.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-600">완료된 에어드롭</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {airdropHistory.reduce((sum, h) => sum + (h.status === 'completed' ? parseFloat(h.amount) : 0), 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">총 받은 CTA</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">
                    {airdropHistory.filter(h => h.status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600">대기중인 에어드롭</div>
                </CardContent>
              </Card>
            </div>

            {/* 에어드롭 히스토리 */}
            <Card>
              <CardHeader>
                <CardTitle>🪙 에어드롭 내역</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">⏳</div>
                    <div className="text-gray-500">에어드롭 내역을 불러오는 중...</div>
                  </div>
                ) : airdropHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">📭</div>
                    <div className="text-gray-500 mb-4">아직 에어드롭 내역이 없습니다.</div>
                    <Link to="/game">
                      <Button>
                        <span className="mr-2">🎮</span>
                        게임 시작하기
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {airdropHistory.map((airdrop) => (
                      <div key={airdrop.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="text-2xl">
                                {airdrop.status === 'completed' && '✅'}
                                {airdrop.status === 'pending' && '⏳'}
                                {airdrop.status === 'failed' && '❌'}
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{airdrop.period}</h4>
                                <div className="text-sm text-gray-600">
                                  {airdrop.rank}위 • {airdrop.date}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-green-600">
                              {airdrop.amount}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant={
                                  airdrop.status === 'completed' ? 'success' : 
                                  airdrop.status === 'pending' ? 'warning' : 'error'
                                }
                              >
                                {airdrop.status === 'completed' && '완료'}
                                {airdrop.status === 'pending' && '대기중'}
                                {airdrop.status === 'failed' && '실패'}
                              </Badge>
                              {airdrop.txHash && (
                                <a
                                  href={`https://catena.explorer.creatachain.com/tx/${airdrop.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-xs"
                                >
                                  {shortenTxHash(airdrop.txHash)} 🔗
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* CTA 섹션 */}
        <div className="mt-12 text-center">
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
            <CardContent className="py-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                더 높은 순위를 노려보세요! 🚀
              </h3>
              <p className="text-gray-600 mb-6">
                지금 게임에 참여하여 점수를 쌓고 다음 에어드롭의 주인공이 되어보세요!
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/game">
                  <Button size="lg">
                    <span className="mr-2">🎮</span>
                    게임 플레이하기
                  </Button>
                </Link>
                <Link to="/mission">
                  <Button variant="outline" size="lg">
                    <span className="mr-2">🎯</span>
                    미션 수행하기
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export { RankingPage }