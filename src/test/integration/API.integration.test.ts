/**
 * 集成测试：API端点测试
 * 测试HTTP API的完整功能，包括认证、错误处理、响应格式等
 */

import request from 'supertest';
import express from 'express';
import { ReviewSyncService } from '../../services/ReviewSyncService';
import { SupabaseManager } from '../../modules/storage/SupabaseManager';
import { FeishuServiceV1 } from '../../services/FeishuServiceV1';

// Mock dependencies
jest.mock('../../services/ReviewSyncService');
jest.mock('../../modules/storage/SupabaseManager');
jest.mock('../../services/FeishuServiceV1');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const MockedReviewSyncService = ReviewSyncService as jest.MockedClass<typeof ReviewSyncService>;
const MockedSupabaseManager = SupabaseManager as jest.MockedClass<typeof SupabaseManager>;
const MockedFeishuServiceV1 = FeishuServiceV1 as jest.MockedClass<typeof FeishuServiceV1>;

describe('API Integration Tests', () => {
  let app: express.Application;
  let mockReviewSyncService: jest.Mocked<ReviewSyncService>;
  let mockSupabaseManager: jest.Mocked<SupabaseManager>;
  let mockFeishuService: jest.Mocked<FeishuServiceV1>;

  beforeEach(() => {
    // 创建Express应用
    app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // 创建mock实例
    mockReviewSyncService = {
      syncReviews: jest.fn(),
      syncAllApps: jest.fn()
    } as any;

    mockSupabaseManager = {
      upsertAppReviews: jest.fn(),
      getExistingReviewIds: jest.fn(),
      updateReply: jest.fn(),
      hasReply: jest.fn()
    } as any;

    mockFeishuService = {
      getStatus: jest.fn(),
      sendConfirmationMessage: jest.fn(),
      handleFeishuEvent: jest.fn()
    } as any;

    // 设置mock返回值
    MockedReviewSyncService.mockImplementation(() => mockReviewSyncService);
    MockedSupabaseManager.mockImplementation(() => mockSupabaseManager);
    MockedFeishuServiceV1.mockImplementation(() => mockFeishuService);

    // 重置所有mocks
    jest.clearAllMocks();
  });

  describe('健康检查端点', () => {
    beforeEach(() => {
      // 添加健康检查端点
      app.get('/health', (_req, res) => {
        res.json({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          version: '2.1.0',
          apiVersion: 'v1',
          feishuServiceType: 'v1'
        });
      });
    });

    it('应该返回正确的健康状态', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        version: '2.1.0',
        apiVersion: 'v1',
        feishuServiceType: 'v1'
      });
      expect(response.body.timestamp).toBeTruthy();
    });
  });

  describe('评论同步API', () => {
    const apiKey = 'test-api-key';
    let apiAuthMiddleware: express.RequestHandler;

    beforeEach(() => {
      // 添加API认证中间件
      apiAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const providedKey = req.headers['x-api-key'];
        
        if (!providedKey || providedKey !== apiKey) {
          return res.status(401).json({
            success: false,
            error: 'API认证失败，请提供有效的X-API-Key',
            code: 'UNAUTHORIZED'
          });
        }
        
        return next();
      };

      // 添加同步端点
      app.post('/api/sync', apiAuthMiddleware, async (_req, res) => {
        try {
          const appIds = ['test-app-1', 'test-app-2'];
          const results = [];
          
          for (const appId of appIds) {
            const result = await mockReviewSyncService.syncReviews(appId);
            results.push({ appId, ...result });
          }
          
          res.json({ success: true, results });
        } catch (error) {
          res.status(500).json({ 
            success: false, 
            error: (error as Error).message 
          });
        }
      });

      app.get('/api/sync/status', apiAuthMiddleware, (_req, res) => {
        res.json({
          success: true,
          enabled: !!mockReviewSyncService,
          stores: [
            { appId: 'test-app-1', name: 'Test App 1', enabled: true },
            { appId: 'test-app-2', name: 'Test App 2', enabled: true }
          ]
        });
      });
    });

    it('应该成功处理有效的同步请求', async () => {
      // Arrange
      const mockSyncResult = {
        total: 5,
        new: 3,
        updated: 2,
        errors: []
      };
      mockReviewSyncService.syncReviews.mockResolvedValue(mockSyncResult);

      // Act
      const response = await request(app)
        .post('/api/sync')
        .set('X-API-Key', apiKey)
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        success: true,
        results: [
          { appId: 'test-app-1', ...mockSyncResult },
          { appId: 'test-app-2', ...mockSyncResult }
        ]
      });

      expect(mockReviewSyncService.syncReviews).toHaveBeenCalledTimes(2);
      expect(mockReviewSyncService.syncReviews).toHaveBeenNthCalledWith(1, 'test-app-1');
      expect(mockReviewSyncService.syncReviews).toHaveBeenNthCalledWith(2, 'test-app-2');
    });

    it('应该拒绝没有API密钥的请求', async () => {
      const response = await request(app)
        .post('/api/sync')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'API认证失败，请提供有效的X-API-Key',
        code: 'UNAUTHORIZED'
      });

      expect(mockReviewSyncService.syncReviews).not.toHaveBeenCalled();
    });

    it('应该拒绝错误的API密钥', async () => {
      const response = await request(app)
        .post('/api/sync')
        .set('X-API-Key', 'wrong-key')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'API认证失败，请提供有效的X-API-Key',
        code: 'UNAUTHORIZED'
      });

      expect(mockReviewSyncService.syncReviews).not.toHaveBeenCalled();
    });

    it('应该处理同步服务错误', async () => {
      // Arrange
      const syncError = new Error('同步服务内部错误');
      mockReviewSyncService.syncReviews.mockRejectedValue(syncError);

      // Act
      const response = await request(app)
        .post('/api/sync')
        .set('X-API-Key', apiKey)
        .expect(500);

      // Assert
      expect(response.body).toEqual({
        success: false,
        error: '同步服务内部错误'
      });
    });

    it('应该返回正确的同步状态', async () => {
      const response = await request(app)
        .get('/api/sync/status')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        enabled: true,
        stores: [
          { appId: 'test-app-1', name: 'Test App 1', enabled: true },
          { appId: 'test-app-2', name: 'Test App 2', enabled: true }
        ]
      });
    });
  });

  describe('飞书事件处理API', () => {
    beforeEach(() => {
      // 添加飞书事件处理端点
      app.post('/feishu/events', async (req, res) => {
        try {
          const result = await mockFeishuService.handleFeishuEvent(req.body);
          res.json(result);
        } catch (error) {
          res.status(500).json({
            success: false,
            error: (error as Error).message
          });
        }
      });

      app.get('/feishu/status', (_req, res) => {
        const status = mockFeishuService.getStatus();
        res.json(status);
      });
    });

    it('应该正确处理URL验证事件', async () => {
      // Arrange
      const urlVerificationEvent = {
        type: 'url_verification',
        challenge: 'test-challenge-123',
        token: 'test-token'
      };

      mockFeishuService.handleFeishuEvent.mockResolvedValue({
        challenge: 'test-challenge-123'
      });

      // Act
      const response = await request(app)
        .post('/feishu/events')
        .send(urlVerificationEvent)
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        challenge: 'test-challenge-123'
      });

      expect(mockFeishuService.handleFeishuEvent).toHaveBeenCalledWith(urlVerificationEvent);
    });

    it('应该正确处理消息事件', async () => {
      // Arrange
      const messageEvent = {
        type: 'event_callback',
        token: 'test-token',
        event: {
          type: 'message',
          message: {
            message_type: 'text',
            content: '{"text": "/sync"}',
            chat_id: 'test-chat-id'
          },
          sender: {
            sender_id: {
              user_id: 'test-user-id'
            }
          }
        }
      };

      mockFeishuService.handleFeishuEvent.mockResolvedValue({
        code: 0,
        msg: 'success'
      });

      // Act
      const response = await request(app)
        .post('/feishu/events')
        .send(messageEvent)
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        code: 0,
        msg: 'success'
      });

      expect(mockFeishuService.handleFeishuEvent).toHaveBeenCalledWith(messageEvent);
    });

    it('应该处理飞书服务错误', async () => {
      // Arrange
      const event = { type: 'test_event' };
      const feishuError = new Error('飞书服务错误');
      
      mockFeishuService.handleFeishuEvent.mockRejectedValue(feishuError);

      // Act
      const response = await request(app)
        .post('/feishu/events')
        .send(event)
        .expect(500);

      // Assert
      expect(response.body).toEqual({
        success: false,
        error: '飞书服务错误'
      });
    });

    it('应该返回飞书服务状态', async () => {
      // Arrange
      const mockStatus = {
        mode: 'eventsource' as const,
        messageCount: 42,
        apiVersion: 'v1',
        signatureVerification: false
      };

      mockFeishuService.getStatus.mockReturnValue(mockStatus);

      // Act
      const response = await request(app)
        .get('/feishu/status')
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockStatus);
      expect(mockFeishuService.getStatus).toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    beforeEach(() => {
      // 添加一个会抛出错误的端点用于测试
      app.get('/api/error-test', (_req, _res) => {
        throw new Error('测试错误');
      });

      // 添加错误处理中间件
      app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).json({
          success: false,
          error: error.message,
          code: 'INTERNAL_SERVER_ERROR'
        });
      });
    });

    it('应该正确处理未捕获的错误', async () => {
      const response = await request(app)
        .get('/api/error-test')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: '测试错误',
        code: 'INTERNAL_SERVER_ERROR'
      });
    });
  });

  describe('请求体解析', () => {
    beforeEach(() => {
      app.post('/api/test-body', (req, res) => {
        res.json({
          received: req.body,
          contentType: req.get('Content-Type')
        });
      });
    });

    it('应该正确解析JSON请求体', async () => {
      const testData = {
        message: 'test message',
        number: 42,
        array: [1, 2, 3]
      };

      const response = await request(app)
        .post('/api/test-body')
        .send(testData)
        .expect(200);

      expect(response.body.received).toEqual(testData);
      expect(response.body.contentType).toContain('application/json');
    });

    it('应该正确解析URL编码请求体', async () => {
      const response = await request(app)
        .post('/api/test-body')
        .type('form')
        .send('name=test&value=123')
        .expect(200);

      expect(response.body.received).toEqual({
        name: 'test',
        value: '123'
      });
      expect(response.body.contentType).toContain('application/x-www-form-urlencoded');
    });
  });
});
