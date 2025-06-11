// CTA_Mission/frontend/src/pages/HomePage.tsx
import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWeb3Auth } from '../providers/Web3AuthProvider'

// 타입 정의
interface StatsData {
  totalUsers: number
  totalGames: number
  totalRewards: number
  onlineUsers: number
}

interface GameFeature {
  icon: string
  title: string
  description: string
  highlight?: boolean
}

interface RewardTier {
  rank: string
  users: number
  reward: string
  color: string
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

const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`p-6 ${className}`}>
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
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95'
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg',
    secondary: 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700 shadow-lg',
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

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { isConnected, user, login, isLoading } = useWeb3Auth()
  
  // 상태 관리
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 12580,
    totalGames: 45230,
    totalRewards: 125000,
    onlineUsers: 234
  })
  
  const [isStatsAnimated, setIsStatsAnimated] = useState(false)

  // 게임 특징 데이터
  const gameFeatures: GameFeature[] = [
    {
      icon: "⚡",
      title: "실시간 가격 예측",
      description: "1초 간격으로 업데이트되는 실시간 가격 데이터로 정확한 예측 게임",
      highlight: true
    },
    {
      icon: "⏰",
      title: "다양한 게임 모드", 
      description: "15초부터 5분까지 다양한 시간대의 예측 게임 선택 가능"
    },
    {
      icon: "🏆",
      title: "정교한 점수 시스템",
      description: "기본점수 + 5가지 보너스로 구성된 공정하고 재미있는 점수 계산"
    },
    {
      icon: "🪙",
      title: "자동 CTA 에어드롭",
      description: "랭킹에 따라 주기별로 자동 지급되는 CTA 토큰 보상"
    },
    {
      icon: "🛡️",
      title: "Web3Auth 소셜 로그인",
      description: "Google, Apple, Kakao로 간편하게 로그인하고 자동 지갑 생성"
    },
    {
      icon: "👥",
      title: "실시간 랭킹",
      description: "실시간으로 업데이트되는 글로벌 리더보드에서 경쟁"
    }
  ]

  // 보상 등급 데이터
  const rewardTiers: RewardTier[] = [
    { rank: "1등", users: 1, reward: "10,000 CTA", color: "text-yellow-600 bg-yellow-50" },
    { rank: "2등", users: 50, reward: "1,000 CTA", color: "text-gray-600 bg-gray-50" },
    { rank: "3등", users: 500, reward: "100 CTA", color: "text-orange-600 bg-orange-50" },
    { rank: "4등", users: 1000, reward: "10 CTA", color: "text-blue-600 bg-blue-50" }
  ]

  // 통계 애니메이션
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsStatsAnimated(true)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  // 실시간 통계 업데이트 (Mock)
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        onlineUsers: Math.floor(Math.random() * 50) + 200,
        totalGames: prev.totalGames + Math.floor(Math.random() * 3)
      }))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // 숫자 애니메이션 헬퍼
  const animateNumber = (target: number, suffix: string = '') => {
    if (!isStatsAnimated) return '0' + suffix
    return target.toLocaleString() + suffix
  }

  // 로그인 처리
  const handleLogin = async (provider: 'google' | 'apple' | 'kakao') => {
    try {
      await login(provider)
      navigate('/mission')
    } catch (error) {
      console.error('로그인 실패:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            {/* 메인 헤드라인 */}
            <div className="mb-8">
              <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  CTA Mission
                </span>
                <br />
                <span className="text-4xl md:text-5xl font-bold">
                  크립토 가격 예측 게임
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
                <strong>Catena 네트워크</strong>에서 실시간 가격 예측으로 <strong>CTA 토큰</strong>을 획득하세요!
                <br />미션 수행 → 게임 참여 → 랭킹 도전 → 에어드롭 수령
              </p>
            </div>

            {/* CTA 버튼들 */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              {!isConnected ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => handleLogin('google')}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    <span className="mr-2">▶️</span>
                    Google로 게임 시작하기
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleLogin('kakao')}
                      disabled={isLoading}
                      className="bg-white/10 border-white/30 text-white hover:bg-white hover:text-gray-900"
                    >
                      카카오
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleLogin('apple')}
                      disabled={isLoading}
                      className="bg-white/10 border-white/30 text-white hover:bg-white hover:text-gray-900"
                    >
                      Apple
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="text-white text-lg">
                    안녕하세요, <strong>{user?.name || user?.email}</strong>님! 👋
                  </div>
                  <Link to="/mission">
                    <Button size="lg">
                      <span className="mr-2">🎯</span>
                      미션 수행하러 가기
                    </Button>
                  </Link>
                  <Link to="/game">
                    <Button variant="secondary" size="lg">
                      <span className="mr-2">▶️</span>
                      게임 바로 시작
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* 실시간 통계 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="text-3xl font-bold text-white">{animateNumber(stats.totalUsers)}</div>
                <div className="text-blue-200 text-sm">총 참여자</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="text-3xl font-bold text-white">{animateNumber(stats.totalGames)}</div>
                <div className="text-blue-200 text-sm">총 게임 수</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="text-3xl font-bold text-white">{animateNumber(stats.totalRewards, ' CTA')}</div>
                <div className="text-blue-200 text-sm">지급된 보상</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="text-3xl font-bold text-green-400">{animateNumber(stats.onlineUsers)}</div>
                <div className="text-blue-200 text-sm">현재 접속자</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 게임 특징 섹션 */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              왜 CTA Mission을 선택해야 할까요?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              혁신적인 Web3 기술과 재미있는 게임 메커니즘이 결합된 최고의 크립토 게임 경험
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {gameFeatures.map((feature, index) => (
              <Card key={index} className={feature.highlight ? 'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-purple-50' : ''}>
                <CardContent className="text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 text-4xl ${
                    feature.highlight 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                      : 'bg-gray-100'
                  }`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                  {feature.highlight && (
                    <div className="mt-4 inline-flex items-center text-blue-600 font-semibold">
                      <span className="mr-1">⭐</span>
                      핵심 기능
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 게임 플레이 방법 섹션 */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              간단한 3단계로 시작하세요
            </h2>
            <p className="text-xl text-gray-600">
              누구나 쉽게 참여할 수 있는 간단한 프로세스
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 단계 1 */}
            <div className="relative">
              <Card className="h-full">
                <CardContent className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                    1
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">미션 수행</h3>
                  <div className="space-y-3 text-left">
                    <div className="flex items-center">
                      <span className="mr-3">✅</span>
                      <span>Creata Wallet 앱 설치</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-3">✅</span>
                      <span>CreataChain 홈페이지 10초 방문</span>
                    </div>
                  </div>
                  <Link to="/mission" className="mt-6 inline-block w-full">
                    <Button variant="outline" className="w-full">
                      미션 상세보기
                      <span className="ml-2">➡️</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              {/* 연결선 */}
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-3xl">
                ➡️
              </div>
            </div>

            {/* 단계 2 */}
            <div className="relative">
              <Card className="h-full">
                <CardContent className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                    2
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">가격 예측</h3>
                  <div className="space-y-3 text-left">
                    <div className="flex items-center">
                      <span className="mr-3">📈</span>
                      <span>실시간 가격 확인</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-3">🎯</span>
                      <span>UP/DOWN 예측 선택</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-3">⏰</span>
                      <span>15초~5분 게임 시간 선택</span>
                    </div>
                  </div>
                  <Link to="/game" className="mt-6 inline-block w-full">
                    <Button variant="outline" className="w-full">
                      게임 체험하기
                      <span className="ml-2">▶️</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              {/* 연결선 */}
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-3xl">
                ➡️
              </div>
            </div>

            {/* 단계 3 */}
            <div>
              <Card className="h-full">
                <CardContent className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                    3
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">보상 수령</h3>
                  <div className="space-y-3 text-left">
                    <div className="flex items-center">
                      <span className="mr-3">📊</span>
                      <span>점수 획득 및 랭킹 상승</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-3">🏆</span>
                      <span>주기별 랭킹 확정</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-3">🎁</span>
                      <span>CTA 토큰 자동 에어드롭</span>
                    </div>
                  </div>
                  <Link to="/ranking" className="mt-6 inline-block w-full">
                    <Button variant="outline" className="w-full">
                      랭킹 확인하기
                      <span className="ml-2">🏆</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* 보상 시스템 섹션 */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              랭킹별 CTA 보상 시스템
            </h2>
            <p className="text-xl text-gray-600">
              실력에 따라 차등 지급되는 공정한 보상 구조
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {rewardTiers.map((tier, index) => (
              <Card key={index} className={`${tier.color} border-2 ${index === 0 ? 'border-yellow-400 ring-2 ring-yellow-200' : ''}`}>
                <CardContent className="text-center">
                  <div className="mb-4 text-5xl">
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                    {index === 3 && '🏅'}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{tier.rank}</h3>
                  <p className="text-4xl font-bold mb-2">{tier.reward}</p>
                  <p className="text-sm opacity-75">{tier.users}명</p>
                  {index === 0 && (
                    <div className="mt-3 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      최고 등급
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Card className="max-w-3xl mx-auto">
              <CardContent>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">💡 보상 지급 안내</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <span className="mr-2">✅</span>
                    <span>주간/월간 자동 정산</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">✅</span>
                    <span>스마트컨트랙트 자동 지급</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">✅</span>
                    <span>Catena 네트워크 직접 전송</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">✅</span>
                    <span>투명한 랭킹 시스템</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="py-20 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            지금 바로 시작하세요!
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            수천 명의 플레이어가 이미 CTA 토큰을 획득하고 있습니다.
            <br />당신도 지금 참여해서 크립토 예측 마스터가 되어보세요!
          </p>
          
          {!isConnected ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => handleLogin('google')}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                <span className="mr-2">▶️</span>
                Google로 시작하기
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="bg-white/10 border-white/30 text-white hover:bg-white hover:text-gray-900 w-full sm:w-auto"
                onClick={() => window.open('https://creatachain.com', '_blank')}
              >
                <span className="mr-2">🔗</span>
                Catena 네트워크 알아보기
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/mission">
                <Button size="lg">
                  <span className="mr-2">🎯</span>
                  미션 수행하기
                </Button>
              </Link>
              <Link to="/game">
                <Button variant="secondary" size="lg">
                  <span className="mr-2">▶️</span>
                  게임 바로 시작
                </Button>
              </Link>
              <Link to="/ranking">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="bg-white/10 border-white/30 text-white hover:bg-white hover:text-gray-900"
                >
                  <span className="mr-2">🏆</span>
                  랭킹 확인하기
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export { HomePage }