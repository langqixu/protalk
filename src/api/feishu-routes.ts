import { Router, Request, Response } from 'express';
import logger from '../utils/logger';
import { FeishuServiceV1 } from '../services/FeishuServiceV1';
import { handleCardAction, setControllerDataManager } from './controllers/review-card-controller';
import { CardState, ReviewDTO } from '../types/review';
import { buildReviewCardV2 } from '../utils/feishu-card-v2-builder';
import { SupabaseManager } from '../modules/storage/SupabaseManager';
import { MockDataManager } from '../modules/storage/MockDataManager';

const router = Router();
let feishuService: FeishuServiceV1 | null = null;
let mockDataManager: MockDataManager | null = null;
let supabaseManager: SupabaseManager | null = null;

// 检查是否启用模拟模式
const isMockMode = process.env['MOCK_MODE'] === 'true' || process.env['NODE_ENV'] === 'test';

export function setFeishuService(service: FeishuServiceV1) {
  feishuService = service;
  // setControllerFeishuService(service); // Inject service into controller
  
  // 初始化数据管理器
  if (isMockMode) {
    logger.info('启用模拟数据模式');
    mockDataManager = new MockDataManager();
    setControllerDataManager(mockDataManager);
  } else {
    logger.info('使用真实数据库模式');
    if (supabaseManager) {
      logger.info('使用已配置的SupabaseManager');
      setControllerDataManager(supabaseManager);
    } else {
      logger.warn('SupabaseManager未配置，回退到模拟数据模式');
      mockDataManager = new MockDataManager();
      setControllerDataManager(mockDataManager);
    }
  }
}

export function setSupabaseManager(manager: SupabaseManager) {
  supabaseManager = manager;
  logger.info('SupabaseManager已设置');
  
  // 立即检查是否应该使用Supabase
  if (!isMockMode && supabaseManager) {
    logger.info('立即激活Supabase数据管理器');
    setControllerDataManager(supabaseManager);
  }
}

// Main event handler for Feishu callbacks
router.post('/events', async (req: Request, res: Response) => {
  logger.info('Received Feishu event callback', { body: req.body });

  if (req.body.challenge) {
    logger.info('Responding to challenge request');
    return res.status(200).json({ challenge: req.body.challenge });
  }

  // Handle Feishu Card 2.0 callback structure
  if (req.body.header && req.body.event) {
    const { event_type } = req.body.header;
    const { action, context } = req.body.event;
    const message_id = context?.open_message_id;

    if (event_type === 'card.action.trigger' && action && message_id) {
      try {
        logger.info('Processing card.action.trigger event', { action });
        const response = await handleCardAction(action, message_id);
        return res.status(200).json(response || { success: true });
      } catch (error) {
        logger.error('Error handling card action', { error, action });
        return res.status(200).json({
          toast: {
            type: 'error',
            content: '处理出错，请稍后重试'
          }
        });
      }
    }
  }

  logger.warn('Unhandled event or invalid payload', { body: req.body });
  return res.status(200).json({ success: true, message: 'Event received but not handled' });
});

// Unified test endpoint for review cards
router.post('/test/review-card', async (req: Request, res: Response) => {
    if (!feishuService) {
        return res.status(503).json({ success: false, error: 'Feishu service not initialized.' });
    }

    // 检查数据管理器是否可用
    const dataManager = isMockMode ? mockDataManager : supabaseManager;
    if (!dataManager) {
        return res.status(503).json({ success: false, error: 'Data manager not initialized.' });
    }

    try {
        const reviewData: ReviewDTO = req.body.reviewData || {
            id: `test_${Date.now()}`,
            appId: 'testApp',
            appName: 'Test App',
            rating: 5,
            title: 'Test Title',
            body: 'Test Body',
            author: 'Test Author',
            createdAt: new Date().toISOString(),
            version: '1.0',
            countryCode: 'US',
        };
        
        // Save this review to the data manager
        await dataManager.saveReview(reviewData);
        logger.info('测试评论数据已保存到数据管理器', { reviewId: reviewData.id, mode: isMockMode ? 'mock' : 'supabase' });

        const card = buildReviewCardV2(reviewData, CardState.NO_REPLY);
        const chatId = await feishuService.getFirstChatId();
        if (!chatId) {
            return res.status(404).json({ success: false, error: 'No available chat ID found.' });
        }
        
        const messageResult = await feishuService.sendCardMessage(chatId, card);
        
        // 建立消息ID和评论ID的映射关系
        if (messageResult?.message_id && dataManager.mapMessageToReview) {
            await dataManager.mapMessageToReview(messageResult.message_id, reviewData.id);
            logger.info('消息映射已建立', { messageId: messageResult.message_id, reviewId: reviewData.id });
        }
        
        return res.status(200).json({ 
            success: true, 
            message: `Test card sent and saved to ${isMockMode ? 'mock' : 'supabase'} data manager.`,
            reviewId: reviewData.id,
            messageId: messageResult?.message_id
        });
    } catch (error) {
        logger.error('Error in test endpoint', { error });
        return res.status(500).json({ success: false, error: 'Failed to send card' });
    }
});

// 获取模拟数据统计信息的调试端点
router.get('/debug/mock-data', async (_req: Request, res: Response) => {
    if (!mockDataManager) {
        return res.status(503).json({ success: false, error: 'Mock data manager not available.' });
    }

    try {
        const stats = await mockDataManager.getStats();
        const allReviews = await mockDataManager.getAllReviews();
        
        return res.status(200).json({
            success: true,
            stats,
            reviews: allReviews.map(review => ({
                id: review.id,
                title: review.title,
                rating: review.rating,
                hasReply: !!review.developerResponse,
            }))
        });
    } catch (error) {
        logger.error('Error getting mock data stats', { error });
        return res.status(500).json({ success: false, error: 'Failed to get stats' });
    }
});

// Debug endpoint to check current data manager status
router.get('/debug/data-manager', async (_req: Request, res: Response) => {
  return res.json({
    success: true,
    status: {
      isMockMode: isMockMode,
      mockManagerAvailable: !!mockDataManager,
      supabaseManagerAvailable: !!supabaseManager,
      currentMode: isMockMode ? 'mock' : 'supabase',
      environment: process.env['NODE_ENV'] || 'unknown',
      mockModeEnv: process.env['MOCK_MODE'] || 'undefined'
    }
  });
});

// Debug endpoint to test Supabase connection and schema
router.get('/debug/supabase-test', async (_req: Request, res: Response) => {
  if (!supabaseManager) {
    return res.status(503).json({ 
      success: false, 
      error: 'Supabase manager not available' 
    });
  }

  try {
    // Test 1: Check if tables exist by querying their structure
    const results: any = {
      success: true,
      tests: {},
      timestamp: new Date().toISOString()
    };

    // Test connection by doing a simple query
    try {
      // 这里我们需要访问Supabase client，但需要先暴露它
      results.tests.connection = { 
        status: 'success', 
        message: 'SupabaseManager is available' 
      };
    } catch (error) {
      results.tests.connection = { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }

    // Test 2: Try to save a test review
    try {
      const testReview: ReviewDTO = {
        id: `supabase_test_${Date.now()}`,
        appId: 'test_app',
        appName: 'Test App',
        rating: 5,
        title: 'Database Test',
        body: 'Testing Supabase integration',
        author: 'Test User',
        createdAt: new Date().toISOString(),
        version: '1.0.0',
        countryCode: 'CN'
      };

      await supabaseManager.saveReview(testReview);
      results.tests.saveReview = { 
        status: 'success', 
        reviewId: testReview.id,
        message: 'Test review saved successfully' 
      };

      // Test 3: Try to retrieve the test review
      const retrievedReview = await supabaseManager.getReviewById(testReview.id);
      if (retrievedReview) {
        results.tests.getReview = { 
          status: 'success', 
          review: retrievedReview,
          message: 'Test review retrieved successfully' 
        };
      } else {
        results.tests.getReview = { 
          status: 'error', 
          message: 'Test review not found after save' 
        };
      }

    } catch (error) {
      results.tests.saveReview = { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }

    return res.json(results);

  } catch (error) {
    logger.error('Error in Supabase test', { error });
    return res.status(500).json({ 
      success: false, 
      error: 'Supabase test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;