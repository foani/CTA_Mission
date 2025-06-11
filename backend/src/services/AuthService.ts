import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User, SocialProvider } from '../models/User';

export interface Web3AuthTokenPayload {
  sub: string; // 사용자 고유 ID
  email: string;
  name?: string;
  picture?: string;
  iss: string; // 발급자
  aud: string; // 대상
  exp: number; // 만료 시간
  iat: number; // 발급 시간
  provider?: string; // 소셜 제공자
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  message?: string;
}

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);
  private jwtSecret: string;
  private refreshSecret: string;
  private accessTokenExpiry: string = '1h';
  private refreshTokenExpiry: string = '7d';

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
    
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      console.warn('JWT secrets not found in environment variables, using default values');
    }
  }

  /**
   * Web3Auth 토큰 검증 및 사용자 인증
   */
  async authenticateWithWeb3Auth(web3AuthToken: string): Promise<AuthResult> {
    try {
      // Web3Auth 토큰 디코딩 (실제로는 Web3Auth SDK로 검증해야 함)
      const decoded = this.decodeWeb3AuthToken(web3AuthToken);
      
      if (!decoded) {
        return {
          success: false,
          message: '유효하지 않은 Web3Auth 토큰입니다.'
        };
      }

      // 사용자 조회 또는 생성
      let user = await this.userRepository.findOne({ 
        where: { socialId: decoded.sub } 
      });

      if (!user) {
        // 새 사용자 생성
        user = this.userRepository.create({
          email: decoded.email,
          socialId: decoded.sub,
          socialProvider: this.mapSocialProvider(decoded.provider || 'google'),
          displayName: decoded.name,
          profileImage: decoded.picture,
          username: this.generateUsername(decoded.email)
        });

        await this.userRepository.save(user);
      } else {
        // 기존 사용자 정보 업데이트
        user.displayName = decoded.name || user.displayName;
        user.profileImage = decoded.picture || user.profileImage;
        user.updateLastLogin();
        
        await this.userRepository.save(user);
      }

      // JWT 토큰 생성
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      return {
        success: true,
        user,
        accessToken,
        refreshToken,
        message: '인증이 완료되었습니다.'
      };

    } catch (error) {
      console.error('Web3Auth 인증 실패:', error);
      return {
        success: false,
        message: '인증 처리 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 사용자 로그아웃
   */
  async logout(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.userRepository.findOne({ 
        where: { id: userId } 
      });

      if (user) {
        // 로그아웃 시간 기록 등 추가 로직
        await this.userRepository.save(user);
      }

      return {
        success: true,
        message: '로그아웃되었습니다.'
      };

    } catch (error) {
      console.error('로그아웃 실패:', error);
      return {
        success: false,
        message: '로그아웃 처리 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 액세스 토큰 생성
   */
  private generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry
    } as jwt.SignOptions);
  }

  /**
   * 리프레시 토큰 생성
   */
  private generateRefreshToken(user: User): string {
    const payload = {
      userId: user.id,
      type: 'refresh'
    };

    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshTokenExpiry
    } as jwt.SignOptions);
  }

  /**
   * 액세스 토큰 검증
   */
  async verifyAccessToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;
      
      const user = await this.userRepository.findOne({ 
        where: { id: decoded.userId } 
      });

      return user;
    } catch (error) {
      console.error('토큰 검증 실패:', error);
      return null;
    }
  }

  /**
   * 리프레시 토큰으로 새 액세스 토큰 발급
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthResult> {
    try {
      const decoded = jwt.verify(refreshToken, this.refreshSecret) as any;
      
      const user = await this.userRepository.findOne({ 
        where: { id: decoded.userId } 
      });

      if (!user) {
        return {
          success: false,
          message: '사용자를 찾을 수 없습니다.'
        };
      }

      const newAccessToken = this.generateAccessToken(user);

      return {
        success: true,
        user,
        accessToken: newAccessToken,
        message: '토큰이 갱신되었습니다.'
      };

    } catch (error) {
      console.error('토큰 갱신 실패:', error);
      return {
        success: false,
        message: '토큰 갱신에 실패했습니다.'
      };
    }
  }

  /**
   * 사용자 정보 조회
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({ 
        where: { id: userId } 
      });
    } catch (error) {
      console.error('사용자 조회 실패:', error);
      return null;
    }
  }

  /**
   * Web3Auth 토큰 디코딩 (실제로는 Web3Auth SDK 사용)
   */
  private decodeWeb3AuthToken(token: string): Web3AuthTokenPayload | null {
    try {
      // 실제로는 Web3Auth SDK의 검증 메서드를 사용해야 함
      // 여기서는 JWT 디코딩으로 대체
      const decoded = jwt.decode(token) as Web3AuthTokenPayload;
      
      if (!decoded || !decoded.sub || !decoded.email) {
        return null;
      }

      return decoded;
    } catch (error) {
      console.error('Web3Auth 토큰 디코딩 실패:', error);
      return null;
    }
  }

  /**
   * 소셜 제공자 매핑
   */
  private mapSocialProvider(provider: string): SocialProvider {
    switch (provider.toLowerCase()) {
      case 'google':
        return SocialProvider.GOOGLE;
      case 'apple':
        return SocialProvider.APPLE;
      case 'kakao':
        return SocialProvider.KAKAO;
      case 'discord':
        return SocialProvider.DISCORD;
      default:
        return SocialProvider.GOOGLE;
    }
  }

  /**
   * 사용자명 생성
   */
  private generateUsername(email: string): string {
    const baseUsername = email.split('@')[0];
    const randomSuffix = Math.floor(Math.random() * 10000);
    return `${baseUsername}_${randomSuffix}`;
  }

  /**
   * 사용자 프로필 업데이트
   */
  async updateUserProfile(userId: string, updates: {
    username?: string;
    displayName?: string;
    profileImage?: string;
    preferredLanguage?: string;
  }): Promise<AuthResult> {
    try {
      const user = await this.userRepository.findOne({ 
        where: { id: userId } 
      });

      if (!user) {
        return {
          success: false,
          message: '사용자를 찾을 수 없습니다.'
        };
      }

      // 사용자명 중복 확인
      if (updates.username && updates.username !== user.username) {
        const existingUser = await this.userRepository.findOne({
          where: { username: updates.username }
        });

        if (existingUser) {
          return {
            success: false,
            message: '이미 사용 중인 사용자명입니다.'
          };
        }
      }

      // 프로필 업데이트
      user.updateProfile(updates);
      await this.userRepository.save(user);

      return {
        success: true,
        user,
        message: '프로필이 업데이트되었습니다.'
      };

    } catch (error) {
      console.error('프로필 업데이트 실패:', error);
      return {
        success: false,
        message: '프로필 업데이트 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 계정 상태 변경 (관리자용)
   */
  async updateUserStatus(userId: string, action: 'activate' | 'deactivate' | 'suspend' | 'ban'): Promise<AuthResult> {
    try {
      const user = await this.userRepository.findOne({ 
        where: { id: userId } 
      });

      if (!user) {
        return {
          success: false,
          message: '사용자를 찾을 수 없습니다.'
        };
      }

      switch (action) {
        case 'activate':
          user.activate();
          break;
        case 'deactivate':
          user.deactivate();
          break;
        case 'suspend':
          user.suspend();
          break;
        case 'ban':
          user.ban();
          break;
      }

      await this.userRepository.save(user);

      return {
        success: true,
        user,
        message: `사용자 상태가 ${action}으로 변경되었습니다.`
      };

    } catch (error) {
      console.error('사용자 상태 변경 실패:', error);
      return {
        success: false,
        message: '사용자 상태 변경 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 지갑 주소 설정
   */
  async setWalletAddress(userId: string, walletAddress: string): Promise<AuthResult> {
    try {
      const user = await this.userRepository.findOne({ 
        where: { id: userId } 
      });

      if (!user) {
        return {
          success: false,
          message: '사용자를 찾을 수 없습니다.'
        };
      }

      user.setWalletAddress(walletAddress);
      await this.userRepository.save(user);

      return {
        success: true,
        user,
        message: '지갑 주소가 설정되었습니다.'
      };

    } catch (error) {
      console.error('지갑 주소 설정 실패:', error);
      return {
        success: false,
        message: '지갑 주소 설정 중 오류가 발생했습니다.'
      };
    }
  }
}