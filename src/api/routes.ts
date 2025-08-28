import { Router, Request, Response } from 'express';
import { ReviewSyncService } from '../services/ReviewSyncService';
import { ReplyRequest } from '../types';
import logger from '../utils/logger';
import jwt from 'jsonwebtoken';

export function createRoutes(syncService: ReviewSyncService, apiKey?: string) {
  const router = Router();

  // API认证中间件
  const authenticate = (req: Request, res: Response, next: Function) => {
    if (!apiKey) {
      return next();
    }

    const providedKey = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
    
    if (!providedKey || providedKey !== apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API密钥无效'
      });
    }

    next();
  };

  // 健康检查
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'app-review-service'
      }
    });
  });

  // 详细状态检查
  router.get('/status', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        service: 'App Review Service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env['NODE_ENV'] || 'development'
      }
    });
  });

  // JWT调试端点
  router.get('/debug-jwt', (_req: Request, res: Response) => {
    try {
      const issuerId = process.env['APP_STORE_ISSUER_ID'] || '';
      const keyId = process.env['APP_STORE_KEY_ID'] || '';
      const privateKey = process.env['APP_STORE_PRIVATE_KEY'] || '';

      // 检查配置
      const hasIssuerId = !!issuerId;
      const hasKeyId = !!keyId;
      const hasPrivateKey = !!privateKey;
      const privateKeyLength = privateKey.length;
      const privateKeyPreview = privateKey.substring(0, 150) + '...';
      
      // 检查是否包含错误字符
      const hasErrorChar = privateKey.includes('Ø');
      const errorCharPosition = privateKey.indexOf('Ø');
      
      // 检查私钥格式
      const hasBeginHeader = privateKey.includes('-----BEGIN PRIVATE KEY-----');
      const hasEndHeader = privateKey.includes('-----END PRIVATE KEY-----');
      const hasQuotes = privateKey.startsWith('"') && privateKey.endsWith('"');
      
      // 处理转义字符
      const processedPrivateKey = privateKey.replace(/\\n/g, '\n');
      const processedLength = processedPrivateKey.length;
      const processedPreview = processedPrivateKey.substring(0, 150) + '...';
      const hasEscapedChars = privateKey.includes('\\n');

      res.json({
        success: true,
        data: {
          hasIssuerId,
          hasKeyId,
          hasPrivateKey,
          privateKeyLength,
          privateKeyPreview,
          hasErrorChar,
          errorCharPosition,
          hasBeginHeader,
          hasEndHeader,
          hasQuotes,
          hasEscapedChars,
          processedLength,
          processedPreview,
          issuerId: hasIssuerId ? issuerId : null,
          keyId: hasKeyId ? keyId : null
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'JWT调试失败',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // JWT测试端点
  router.get('/test-jwt', (_req: Request, res: Response) => {
    try {
      const issuerId = process.env['APP_STORE_ISSUER_ID'] || '';
      const keyId = process.env['APP_STORE_KEY_ID'] || '';
      const privateKey = process.env['APP_STORE_PRIVATE_KEY'] || '';

      // 处理转义字符
      const processedPrivateKey = privateKey.replace(/\\n/g, '\n');

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: issuerId,
        iat: now,
        exp: now + (20 * 60),
        aud: 'appstoreconnect-v1'
      };

      const token = jwt.sign(payload, processedPrivateKey, {
        algorithm: 'ES256',
        keyid: keyId
      });

      res.json({
        success: true,
        data: {
          token: token.substring(0, 50) + '...',
          tokenLength: token.length,
          payload,
          processedKeyLength: processedPrivateKey.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'JWT测试失败',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // 同步评论 - GET
  router.get('/sync-reviews', authenticate, async (req: Request, res: Response) => {
    try {
      const appId = req.query['appId'] as string;
      
      if (!appId) {
        return res.status(400).json({
          success: false,
          error: '缺少appId参数'
        });
      }

      logger.info('收到同步评论请求', { appId, method: 'GET' });

      const result = await syncService.syncReviews(appId);
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      logger.error('同步评论失败', { 
        error: errorMessage,
        method: 'GET'
      });
      
      return res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  });

  // 同步评论 - POST
  router.post('/sync-reviews', authenticate, async (req: Request, res: Response) => {
    try {
      const { appIds } = req.body;
      
      if (!appIds || !Array.isArray(appIds) || appIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: '缺少appIds数组参数'
        });
      }

      logger.info('收到批量同步评论请求', { appIds, method: 'POST' });

      const result = await syncService.syncAllApps(appIds);
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      logger.error('批量同步评论失败', { 
        error: errorMessage,
        method: 'POST'
      });
      
      return res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  });

  // 回复评论
  router.post('/reply-review', authenticate, async (req: Request, res: Response) => {
    try {
      const { review_id, response_body }: ReplyRequest = req.body;
      
      // 验证参数
      if (!review_id) {
        return res.status(400).json({
          success: false,
          error: '缺少review_id参数'
        });
      }

      if (!response_body) {
        return res.status(400).json({
          success: false,
          error: '缺少response_body参数'
        });
      }

      if (response_body.length > 1000) {
        return res.status(400).json({
          success: false,
          error: '回复内容不能超过1000字符'
        });
      }

      logger.info('收到回复评论请求', { review_id });

      const result = await syncService.replyToReview(review_id, response_body);
      
      if (result.success) {
        return res.json({
          success: true,
          data: {
            review_id,
            response_date: result.responseDate,
            message: '回复成功'
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.error || '回复失败'
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      logger.error('回复评论失败', { 
        error: errorMessage
      });
      
      return res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  });

  // 获取同步状态
  router.get('/sync-status/:appId', authenticate, async (req: Request, res: Response) => {
    try {
      const { appId } = req.params;
      
      if (!appId) {
        return res.status(400).json({
          success: false,
          error: '缺少appId参数'
        });
      }

      logger.info('收到获取同步状态请求', { appId });

      const status = await syncService.getSyncStatus(appId);
      
      return res.json({
        success: true,
        data: status
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      logger.error('获取同步状态失败', { 
        error: errorMessage
      });
      
      return res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  });

  // 测试飞书连接
  router.post('/test-feishu', authenticate, async (_req: Request, res: Response) => {
    try {
      logger.info('收到测试飞书连接请求');

      // 这里需要访问pusher实例，暂时返回成功
      // 实际实现中需要从syncService中获取pusher实例
      
      return res.json({
        success: true,
        data: {
          message: '飞书连接测试功能需要进一步实现'
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      logger.error('测试飞书连接失败', { 
        error: errorMessage
      });
      
      return res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  });

  // 404处理
  router.use('*', (_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: '接口不存在'
    });
  });

  return router;
}
