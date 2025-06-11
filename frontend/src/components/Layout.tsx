import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const navigation = [
    { name: '홈', href: '/', current: location.pathname === '/' },
    { name: '미션', href: '/mission', current: location.pathname === '/mission' },
    { name: '게임', href: '/game', current: location.pathname === '/game' },
    { name: '랭킹', href: '/ranking', current: location.pathname === '/ranking' },
  ]

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <h1 className="text-xl font-bold text-cta-primary">CTA Mission</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 ${ 
                      item.current
                        ? 'border-cta-primary text-white'
                        : 'border-transparent text-gray-300 hover:border-gray-300 hover:text-white'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <button className="bg-cta-primary hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                지갑 연결
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-10">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}