// CTA_Mission/frontend/src/App.tsx
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

// Providers
import { Web3AuthProvider } from './providers/Web3AuthProvider'

// Layout
import { Layout } from './components/Layout/Layout'

// Pages
import { HomePage } from './pages/HomePage'
import { MissionPage } from './pages/MissionPage'
import { GamePage } from './pages/GamePage'
import { RankingPage } from './pages/RankingPage'
import { LoginPage } from './pages/LoginPage'

// 단순한 Error Boundary 클래스 컴포넌트
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">앱에서 오류가 발생했습니다</h2>
              <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// 인증이 필요한 페이지를 위한 Protected Route 컴포넌트
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Web3Auth 상태 확인 (추후 useWeb3Auth hook 사용)
  const isAuthenticated = (() => {
    try {
      return !!localStorage.getItem('token')
    } catch {
      return false
    }
  })()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// 메인 App 컴포넌트
function App() {
  return (
    <AppErrorBoundary>
      <Web3AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected Routes with Layout */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <HomePage />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/mission" element={
              <ProtectedRoute>
                <Layout>
                  <MissionPage />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/game" element={
              <ProtectedRoute>
                <Layout>
                  <GamePage />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/ranking" element={
              <ProtectedRoute>
                <Layout>
                  <RankingPage />
                </Layout>
              </ProtectedRoute>
            } />
            
            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </Web3AuthProvider>
    </AppErrorBoundary>
  )
}

export default App