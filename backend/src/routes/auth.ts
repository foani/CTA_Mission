import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validation';
import { body } from 'express-validator'; // validationResult 사용하지 않음
import { AppDataSource } from '../config/database';
import { User } from '../models/User';

const router = Router();
const authService = new AuthService();
const userRepository = AppDataSource.getRepository(User);

/**
 * Web3Auth 로그인
 */
router.post('/login', 
  [
    body('web3AuthToken').notEmpty().withMessage('Web3Auth 토큰이 필요합니다.'),
    validateRequest
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { web3AuthToken } = req.body;

      const result = await authService.authenticateWithWeb3Auth(web3AuthToken);

      if (!result.success) {
        res.status(401).json(result);
        return;
      }

      res.json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        },
        message: result.message
      });
    } catch (error) {
      console.error('로그인 실패:', error);
      res.status(500).json({
        success: false,
        message: '로그인 처리 중 오류가 발생했습니다.'
      });
    }
  }
);

/**
 * 로그아웃
 */
router.post('/logout', 
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
        return;
      }

      const result = await authService.logout(userId);

      res.json(result);
    } catch (error) {
      console.error('로그아웃 실패:', error);
      res.status(500).json({
        success: false,
        message: '로그아웃 처리 중 오류가 발생했습니다.'
      });
    }
  }
);

/**
 * 토큰 갱신
 */
router.post('/refresh',
  [
    body('refreshToken').notEmpty().withMessage('리프레시 토큰이 필요합니다.'),
    validateRequest
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      const result = await authService.refreshAccessToken(refreshToken);

      if (!result.success) {
        res.status(401).json(result);
        return;
      }

      res.json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken
        },
        message: result.message
      });
    } catch (error) {
      console.error('토큰 갱신 실패:', error);
      res.status(500).json({
        success: false,
        message: '토큰 갱신 중 오류가 발생했습니다.'
      });
    }
  }
);

/**
 * 사용자 프로필 조회
 */
router.get('/profile', 
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
        return;
      }

      const user = await userRepository.findOne({ 
        where: { id: userId },
        relations: ['predictions', 'rankings', 'userMissions']
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: '사용자를 찾을 수 없습니다.'
        });
        return;
      }

      res.json({
        success: true,
        data: user,
        message: '프로필 조회 성공'
      });
    } catch (error) {
      console.error('프로필 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: '프로필 조회 중 오류가 발생했습니다.'
      });
    }
  }
);

/**
 * 사용자 프로필 업데이트
 */
router.put('/profile', 
  authMiddleware,
  [
    body('username').optional().isLength({ min: 3, max: 20 }).withMessage('사용자명은 3-20자여야 합니다.'),
    body('displayName').optional().isLength({ min: 1, max: 50 }).withMessage('표시명은 1-50자여야 합니다.'),
    body('preferredLanguage').optional().isIn(['ko', 'en', 'ja', 'vi']).withMessage('지원되지 않는 언어입니다.'),
    validateRequest
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
        return;
      }

      const user = await userRepository.findOne({ 
        where: { id: userId } 
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: '사용자를 찾을 수 없습니다.'
        });
        return;
      }

      const { username, displayName, profileImage, preferredLanguage } = req.body;

      // 사용자명 중복 확인
      if (username && username !== user.username) {
        const existingUser = await userRepository.findOne({
          where: { username }
        });

        if (existingUser) {
          res.status(400).json({
            success: false,
            message: '이미 사용 중인 사용자명입니다.'
          });
          return;
        }
      }

      const result = await authService.updateUserProfile(userId, {
        username,
        displayName,
        profileImage,
        preferredLanguage
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json({
        success: true,
        data: result.user,
        message: result.message
      });
    } catch (error) {
      console.error('프로필 업데이트 실패:', error);
      res.status(500).json({
        success: false,
        message: '프로필 업데이트 중 오류가 발생했습니다.'
      });
    }
  }
);

/**
 * 토큰 검증
 */
router.get('/verify', 
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
        return;
      }

      const user = await userRepository.findOne({ 
        where: { id: userId } 
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: '사용자를 찾을 수 없습니다.'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: user.getSummary(),
          isValid: true
        },
        message: '토큰이 유효합니다.'
      });
    } catch (error) {
      console.error('토큰 검증 실패:', error);
      res.status(500).json({
        success: false,
        message: '토큰 검증 중 오류가 발생했습니다.'
      });
    }
  }
);

/**
 * 지갑 주소 설정
 */
router.post('/wallet',
  authMiddleware,
  [
    body('walletAddress').notEmpty().withMessage('지갑 주소가 필요합니다.'),
    validateRequest
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { walletAddress } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
        return;
      }

      const result = await authService.setWalletAddress(userId, walletAddress);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json({
        success: true,
        data: result.user,
        message: result.message
      });
    } catch (error) {
      console.error('지갑 주소 설정 실패:', error);
      res.status(500).json({
        success: false,
        message: '지갑 주소 설정 중 오류가 발생했습니다.'
      });
    }
  }
);

/**
 * 사용자 상태 변경 (관리자 전용)
 */
router.patch('/users/:userId/status',
  authMiddleware,
  [
    body('action').isIn(['activate', 'deactivate', 'suspend', 'ban']).withMessage('유효하지 않은 액션입니다.'),
    validateRequest
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const currentUser = req.user;
      const { userId } = req.params;
      const { action } = req.body;

      // 관리자 권한 확인 (TODO: User 모델에 isAdmin 속성 추가 후 활성화)
      // if (!currentUser?.isAdmin) {
      //   res.status(403).json({
      //     success: false,
      //     message: '관리자 권한이 필요합니다.'
      //   });
      //   return;
      // }
      
      // 임시로 모든 인증된 사용자를 관리자로 처리
      if (!currentUser) {
        res.status(401).json({
          success: false,
          message: '로그인이 필요합니다.'
        });
        return;
      }

      const result = await authService.updateUserStatus(userId, action);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json({
        success: true,
        data: result.user,
        message: result.message
      });
    } catch (error) {
      console.error('사용자 상태 변경 실패:', error);
      res.status(500).json({
        success: false,
        message: '사용자 상태 변경 중 오류가 발생했습니다.'
      });
    }
  }
);

export default router;