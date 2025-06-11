import React, { Component, ReactNode, ErrorInfo } from 'react';

/**
 * 에러 정보 인터페이스
 */
interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
  errorId: string;
  errorBoundary: string;
}

/**
 * ErrorBoundary Props 인터페이스
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  level?: 'page' | 'component' | 'critical';
  className?: string;
}

/**
 * ErrorBoundary State 인터페이스
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  lastPropsSignature: string;
}

/**
 * 에러 로그 전송을 위한 인터페이스
 */
interface ErrorLogPayload {
  errorDetails: ErrorDetails;
  context: {
    component: string;
    level: string;
    retryCount: number;
  };
}

/**
 * React 에러 바운더리 컴포넌트
 * 자식 컴포넌트에서 발생하는 JavaScript 에러를 캐치하고 처리
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private timeoutId: number | null = null;
  private readonly MAX_RETRY_COUNT = 3;
  private readonly RETRY_DELAY = 1000;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      lastPropsSignature: this.getPropsSignature(props)
    };
  }

  /**
   * Props 변경 감지를 위한 시그니처 생성
   */
  private getPropsSignature(props: ErrorBoundaryProps): string {
    try {
      return JSON.stringify({
        childrenType: typeof props.children,
        level: props.level,
        isolate: props.isolate,
        resetOnPropsChange: props.resetOnPropsChange
      });
    } catch {
      return String(Date.now());
    }
  }

  /**
   * 에러 발생 시 호출되는 static 메서드
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  /**
   * Props 변경 시 에러 상태 초기화 (선택적)
   */
  static getDerivedStateFromProps(
    nextProps: ErrorBoundaryProps, 
    prevState: ErrorBoundaryState
  ): Partial<ErrorBoundaryState> | null {
    if (nextProps.resetOnPropsChange && prevState.hasError) {
      const currentSignature = ErrorBoundary.getPropsSignatureStatic(nextProps);
      
      if (currentSignature !== prevState.lastPropsSignature) {
        return {
          hasError: false,
          error: null,
          errorInfo: null,
          errorId: null,
          retryCount: 0,
          lastPropsSignature: currentSignature
        };
      }
    }
    
    return null;
  }

  /**
   * 에러 캐치 및 처리
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorDetails = this.createErrorDetails(error, errorInfo);
    
    this.setState({
      errorInfo
    });

    // 에러 로깅
    this.logError(errorDetails);

    // 외부 에러 핸들러 호출
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        console.error('Error in onError handler:', handlerError);
      }
    }

    // 개발 환경에서 에러 상세 출력
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Error Details:', errorDetails);
      console.groupEnd();
    }
  }

  /**
   * 에러 상세 정보 생성
   */
  private createErrorDetails(error: Error, errorInfo: ErrorInfo): ErrorDetails {
    const now = new Date().toISOString();
    const errorId = this.state.errorId || `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      message: error.message || 'Unknown error',
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: now,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      userId: this.getUserId(),
      errorId,
      errorBoundary: this.props.level || 'component'
    };
  }

  /**
   * 사용자 ID 가져오기 (로컬 스토리지에서)
   */
  private getUserId(): string | undefined {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return undefined;
    }

    try {
      const authData = localStorage.getItem('authToken') || localStorage.getItem('userData');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.userId || parsed.id;
      }
    } catch {
      // 조용히 실패
    }
    
    return undefined;
  }

  /**
   * 에러 로깅 (백엔드 전송)
   */
  private async logError(errorDetails: ErrorDetails): Promise<void> {
    try {
      const payload: ErrorLogPayload = {
        errorDetails,
        context: {
          component: 'ErrorBoundary',
          level: this.props.level || 'component',
          retryCount: this.state.retryCount
        }
      };

      // 백엔드로 에러 로그 전송 (선택적)
      if (typeof window !== 'undefined' && navigator.onLine) {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        
        await fetch(`${API_BASE_URL}/api/logs/error`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000) // 5초 타임아웃
        }).catch(() => {
          // 에러 로깅 실패는 조용히 처리
        });
      }

      // 로컬 스토리지에 에러 저장 (오프라인 시 활용)
      this.saveErrorToLocalStorage(errorDetails);
    } catch {
      // 에러 로깅 자체의 에러는 조용히 처리
    }
  }

  /**
   * 로컬 스토리지에 에러 저장
   */
  private saveErrorToLocalStorage(errorDetails: ErrorDetails): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const existingErrors = localStorage.getItem('errorLogs');
      const errors = existingErrors ? JSON.parse(existingErrors) : [];
      
      errors.push(errorDetails);
      
      // 최대 50개까지만 저장
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      
      localStorage.setItem('errorLogs', JSON.stringify(errors));
    } catch {
      // 로컬 스토리지 저장 실패는 조용히 처리
    }
  }

  /**
   * 에러 상태 리셋
   */
  private resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    });
  };

  /**
   * 재시도 처리
   */
  private handleRetry = (): void => {
    if (this.state.retryCount >= this.MAX_RETRY_COUNT) {
      return;
    }

    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1
    }));

    // 지연 후 리셋
    this.timeoutId = window.setTimeout(() => {
      this.resetError();
    }, this.RETRY_DELAY);
  };

  /**
   * 에러 상세 정보 클립보드 복사
   */
  private copyErrorToClipboard = async (): Promise<void> => {
    if (!this.state.error || !this.state.errorInfo) return;

    const errorDetails = this.createErrorDetails(this.state.error, this.state.errorInfo);
    const errorText = JSON.stringify(errorDetails, null, 2);

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(errorText);
      } else {
        // 폴백: textarea를 사용한 복사
        const textArea = document.createElement('textarea');
        textArea.value = errorText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch {
      // 복사 실패는 조용히 처리
    }
  };

  /**
   * 컴포넌트 언마운트 시 정리
   */
  componentWillUnmount(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  /**
   * 기본 에러 UI 렌더링
   */
  private renderDefaultErrorUI(): ReactNode {
    const { error, errorInfo, errorId, retryCount } = this.state;
    const { level = 'component', showDetails = false } = this.props;
    
    const canRetry = retryCount < this.MAX_RETRY_COUNT;
    const isCritical = level === 'critical' || level === 'page';

    return (
      <div className={`error-boundary error-boundary--${level} ${this.props.className || ''}`}>
        <div className="error-boundary__container">
          {/* 에러 아이콘 */}
          <div className="error-boundary__icon">
            {isCritical ? (
              <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : (
              <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          {/* 에러 메시지 */}
          <div className="error-boundary__content">
            <h2 className="error-boundary__title">
              {isCritical ? 'Application Error' : 'Something went wrong'}
            </h2>
            
            <p className="error-boundary__message">
              {isCritical 
                ? 'A critical error occurred. Please refresh the page or contact support.'
                : 'This component encountered an error. You can try reloading or continue using other parts of the application.'
              }
            </p>

            {/* 에러 ID */}
            {errorId && (
              <p className="error-boundary__error-id">
                Error ID: <code>{errorId}</code>
              </p>
            )}

            {/* 액션 버튼들 */}
            <div className="error-boundary__actions">
              {canRetry && (
                <button 
                  onClick={this.handleRetry}
                  className="error-boundary__button error-boundary__button--primary"
                >
                  Try Again {retryCount > 0 && `(${this.MAX_RETRY_COUNT - retryCount} left)`}
                </button>
              )}
              
              <button 
                onClick={() => window.location.reload()}
                className="error-boundary__button error-boundary__button--secondary"
              >
                Reload Page
              </button>

              <button 
                onClick={this.copyErrorToClipboard}
                className="error-boundary__button error-boundary__button--outline"
              >
                Copy Error Details
              </button>
            </div>

            {/* 에러 상세 정보 (개발/디버그 모드) */}
            {showDetails && error && (
              <details className="error-boundary__details">
                <summary className="error-boundary__details-summary">
                  Error Details (Debug)
                </summary>
                <div className="error-boundary__details-content">
                  <div className="error-boundary__error-section">
                    <h4>Error Message:</h4>
                    <pre>{error.message}</pre>
                  </div>
                  
                  {error.stack && (
                    <div className="error-boundary__error-section">
                      <h4>Stack Trace:</h4>
                      <pre>{error.stack.substring(0, 1000)}</pre>
                    </div>
                  )}
                  
                  {errorInfo?.componentStack && (
                    <div className="error-boundary__error-section">
                      <h4>Component Stack:</h4>
                      <pre>{errorInfo.componentStack.substring(0, 1000)}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>

        {/* 에러 바운더리 스타일 */}
        <style jsx>{`
          .error-boundary {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 200px;
            padding: 2rem;
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 0.5rem;
          }
          
          .error-boundary--page {
            min-height: 50vh;
            background-color: #fff;
          }
          
          .error-boundary--critical {
            min-height: 100vh;
            background-color: #fef2f2;
            border: none;
            border-radius: 0;
          }
          
          .error-boundary__container {
            text-align: center;
            max-width: 32rem;
          }
          
          .error-boundary__icon {
            margin-bottom: 1rem;
          }
          
          .error-boundary__title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #991b1b;
            margin-bottom: 0.5rem;
          }
          
          .error-boundary__message {
            color: #7f1d1d;
            margin-bottom: 1rem;
            line-height: 1.5;
          }
          
          .error-boundary__error-id {
            font-size: 0.875rem;
            color: #6b7280;
            margin-bottom: 1.5rem;
          }
          
          .error-boundary__error-id code {
            background-color: #f3f4f6;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            font-family: monospace;
          }
          
          .error-boundary__actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            justify-content: center;
            margin-bottom: 1.5rem;
          }
          
          .error-boundary__button {
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .error-boundary__button--primary {
            background-color: #dc2626;
            color: white;
            border: none;
          }
          
          .error-boundary__button--primary:hover {
            background-color: #b91c1c;
          }
          
          .error-boundary__button--secondary {
            background-color: #6b7280;
            color: white;
            border: none;
          }
          
          .error-boundary__button--secondary:hover {
            background-color: #4b5563;
          }
          
          .error-boundary__button--outline {
            background-color: transparent;
            color: #6b7280;
            border: 1px solid #d1d5db;
          }
          
          .error-boundary__button--outline:hover {
            background-color: #f9fafb;
          }
          
          .error-boundary__details {
            text-align: left;
            margin-top: 1rem;
            border: 1px solid #d1d5db;
            border-radius: 0.375rem;
            overflow: hidden;
          }
          
          .error-boundary__details-summary {
            padding: 0.75rem;
            background-color: #f9fafb;
            cursor: pointer;
            font-weight: 500;
          }
          
          .error-boundary__details-content {
            padding: 1rem;
            max-height: 300px;
            overflow-y: auto;
          }
          
          .error-boundary__error-section {
            margin-bottom: 1rem;
          }
          
          .error-boundary__error-section h4 {
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #374151;
          }
          
          .error-boundary__error-section pre {
            background-color: #f3f4f6;
            padding: 0.75rem;
            border-radius: 0.25rem;
            font-size: 0.75rem;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-word;
          }
        `}</style>
      </div>
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // 커스텀 fallback이 있으면 사용
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // 기본 에러 UI 사용
      return this.renderDefaultErrorUI();
    }

    return this.props.children;
  }
}

export default ErrorBoundary;