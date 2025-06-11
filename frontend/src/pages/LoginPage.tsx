// CTA_Mission/frontend/src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react'
import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useWeb3Auth } from '../providers/Web3AuthProvider'

// 타입 정의
interface LoginState {
  isLoggingIn: boolean
  error: string | null
  selectedProvider: string | null
}

interface LoginFeature {
  icon: string
  title: string
  description: string
}

// 기본 UI 컴포넌트들
const Button: React.FC<{
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  variant?: 'primary' | 'secondary' | 'outline' | 'social'
  size?: 'sm' | 'default' | 'lg'
}> = ({ 
  children, 
  onClick, 
  disabled = false, 
  className = '', 
  variant = 'primary',
  size = 'default'
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg transform hover:scale-105 active:scale-95',
    secondary: 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border border-white/20',
    outline: 'border-2 border-white/30 text-white hover:bg-white/10',
    social: 'bg-white text-gray-900 hover:bg-gray-50 shadow-lg border border-gray-200 transform hover:scale-105 active:scale-95'
  }
  
  const sizeClasses = {
    sm: 'h-10 px-4 text-sm',
    default: 'h-12 px-6 text-base',
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

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl ${className}`}>
    {children}
  </div>
)

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isConnected, user, login, isLoading, error: web3AuthError, clearError } = useWeb3Auth()
  
  // 상태 관리
  const [loginState, setLoginState] = useState<LoginState>({
    isLoggingIn: false,
    error: null,
    selectedProvider: null
  })

  // 로그인 기능 특징
  const loginFeatures: LoginFeature[] = [
    {
      icon: '🛡️',
      title: '안전한 로그인',
      description: 'Web3Auth 기반 보안 인증'
    },
    {
      icon: '💰',
      title: '자동 지갑 생성',
      description: 'Catena 네트워크 지갑 자동 생성'
    },
    {
      icon: '⚡',
      title: '즉시 시작',
      description: '로그인 후 바로 게임 참여'
    }
  ]

  // 리다이렉트 경로 처리
  const from = (location.state as any)?.from?.pathname || '/mission'

  // 이미 로그인되어 있으면 리다이렉트
  useEffect(() => {
    if (isConnected && user) {
      navigate(from, { replace: true })
    }
  }, [isConnected, user, navigate, from])

  // 에러 상태 동기화
  useEffect(() => {
    if (web3AuthError) {
      setLoginState(prev => ({
        ...prev,
        error: web3AuthError,
        isLoggingIn: false,
        selectedProvider: null
      }))
    }
  }, [web3AuthError])

  // 로딩 상태 동기화
  useEffect(() => {
    setLoginState(prev => ({
      ...prev,
      isLoggingIn: isLoading
    }))
  }, [isLoading])

  // 소셜 로그인 처리
  const handleSocialLogin = async (provider: 'google' | 'apple' | 'kakao') => {
    // 기존 에러 클리어
    if (web3AuthError) {
      clearError()
    }
    
    setLoginState(prev => ({
      ...prev,
      isLoggingIn: true,
      error: null,
      selectedProvider: provider
    }))

    try {
      await login(provider)
      // 성공 시 useEffect에서 자동 리다이렉트 처리
    } catch (error) {
      console.error(`${provider} 로그인 실패:`, error)
      setLoginState(prev => ({
        ...prev,
        error: `${provider} 로그인에 실패했습니다. 다시 시도해주세요.`,
        isLoggingIn: false,
        selectedProvider: null
      }))
    }
  }

  // 에러 클리어
  const handleClearError = () => {
    setLoginState(prev => ({ ...prev, error: null }))
    clearError()
  }

  // 이미 로그인된 경우 리다이렉트
  if (isConnected && user) {
    return <Navigate to={from} replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
      <div className="absolute inset-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
              <span className="text-4xl">🎯</span>
            </div>
            <h1 className="text-4xl font-black text-white mb-3">
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                CTA Mission
              </span>
            </h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              크립토 가격 예측 미션 게임
            </p>
            <p className="text-blue-200 text-sm mt-2">
              Powered by Catena Network
            </p>
          </div>

          {/* Login Card */}
          <Card className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-3">
                로그인하여 시작하기
              </h2>
              <p className="text-blue-200 text-sm leading-relaxed">
                소셜 계정으로 간편하게 로그인하고<br />
                자동으로 지갑이 생성됩니다
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {loginFeatures.map((feature, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20">
                    <span className="text-2xl">{feature.icon}</span>
                  </div>
                  <h3 className="text-white text-xs font-semibold mb-1">{feature.title}</h3>
                  <p className="text-blue-200 text-xs leading-tight">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-4">
              {/* Google Login */}
              <Button
                variant="social"
                size="lg"
                onClick={() => handleSocialLogin('google')}
                disabled={loginState.isLoggingIn}
                className="w-full relative"
              >
                {loginState.isLoggingIn && loginState.selectedProvider === 'google' ? (
                  <>
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mr-3"></div>
                    Google 로그인 중...
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 mr-3 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-5 h-5">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    Google로 계속하기
                  </>
                )}
              </Button>

              {/* Apple Login */}
              <Button
                variant="social"
                size="lg"
                onClick={() => handleSocialLogin('apple')}
                disabled={loginState.isLoggingIn}
                className="w-full"
              >
                {loginState.isLoggingIn && loginState.selectedProvider === 'apple' ? (
                  <>
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mr-3"></div>
                    Apple 로그인 중...
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 mr-3 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                    </div>
                    Apple로 계속하기
                  </>
                )}
              </Button>

              {/* Kakao Login */}
              <Button
                variant="social"
                size="lg"
                onClick={() => handleSocialLogin('kakao')}
                disabled={loginState.isLoggingIn}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900"
              >
                {loginState.isLoggingIn && loginState.selectedProvider === 'kakao' ? (
                  <>
                    <div className="w-6 h-6 border-2 border-gray-600 border-t-yellow-600 rounded-full animate-spin mr-3"></div>
                    카카오 로그인 중...
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 mr-3 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                        <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11L7.404 21.5c-.39.39-.844.463-1.11.193-.265-.27-.196-.72.193-1.11l2.281-2.281C5.91 16.977 1.5 13.156 1.5 11.185 1.5 6.664 6.201 3 12 3z"/>
                      </svg>
                    </div>
                    카카오로 계속하기
                  </>
                )}
              </Button>
            </div>

            {/* Error Message */}
            {(loginState.error || web3AuthError) && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-red-400 mr-2">⚠️</span>
                    <p className="text-red-300 text-sm">
                      {loginState.error || web3AuthError}
                    </p>
                  </div>
                  <button
                    onClick={handleClearError}
                    className="text-red-300 hover:text-red-200 ml-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* User Info Display (성공 상태) */}
            {user && (
              <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  <p className="text-green-300 text-sm">
                    환영합니다, {user.name || user.email}님!
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Footer */}
          <div className="text-center mt-8">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <span className="text-blue-300 text-sm">Powered by</span>
              <span className="font-bold text-white">Catena Network</span>
              <span className="text-2xl">🔗</span>
            </div>
            <p className="text-blue-400 text-xs">
              Web3Auth로 안전하게 보호됩니다
            </p>
            <div className="flex items-center justify-center space-x-4 mt-4 text-xs text-blue-300">
              <span>🔐 보안 인증</span>
              <span>•</span>
              <span>⚡ 빠른 연결</span>
              <span>•</span>
              <span>💰 자동 지갑</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { LoginPage }