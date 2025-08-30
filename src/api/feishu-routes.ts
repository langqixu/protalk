import { Router, Request, Response } from 'express';
import logger from '../utils/logger';
import { FeishuServiceV1 } from '../services/FeishuServiceV1';
import { handleCardAction, setControllerFeishuService, setControllerDataManager } from './controllers/review-card-controller';
import { CardState, ReviewDTO } from '../types/review';
import { buildReviewCardV2 } from '../utils/feishu-card-v2-builder';
// import { SupabaseManager } from '../modules/storage/SupabaseManager';
import { MockDataManager } from '../modules/storage/MockDataManager';

const router = Router();
let feishuService: FeishuServiceV1 | null = null;
let mockDataManager: MockDataManager | null = null;

// 检查是否启用模拟模式
const isMockMode = process.env['MOCK_MODE'] === 'true' || process.env['NODE_ENV'] === 'test';

export function setFeishuService(service: FeishuServiceV1) {
  feishuService = service;
  setControllerFeishuService(service); // Inject service into controller
  
  // 初始化数据管理器
  if (isMockMode) {
    logger.info('启用模拟数据模式');
    mockDataManager = new MockDataManager();
    setControllerDataManager(mockDataManager);
  } else {
    logger.info('使用真实数据库模式');
    // 这里应该初始化 SupabaseManager，但为了测试先使用模拟数据
    mockDataManager = new MockDataManager();
    setControllerDataManager(mockDataManager);
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
        await handleCardAction(action, message_id);
        return res.status(200).json({ success: true });
      } catch (error) {
        logger.error('Error handling card action', { error, action });
        return res.status(500).json({ success: false, error: 'Internal server error' });
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

    if (!mockDataManager) {
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
        
        // Save this review to the mock data manager
        await mockDataManager.saveReview(reviewData);
        logger.info('测试评论数据已保存到模拟数据管理器', { reviewId: reviewData.id });

        const card = buildReviewCardV2(reviewData, CardState.NO_REPLY);
        const chatId = await feishuService.getFirstChatId();
        if (!chatId) {
            return res.status(404).json({ success: false, error: 'No available chat ID found.' });
        }
        
        const messageResult = await feishuService.sendCardMessage(chatId, card);
        
        // 建立消息ID和评论ID的映射关系
        if (messageResult?.message_id) {
            await mockDataManager.mapMessageToReview(messageResult.message_id, reviewData.id);
            logger.info('消息映射已建立', { messageId: messageResult.message_id, reviewId: reviewData.id });
        }
        
        return res.status(200).json({ 
            success: true, 
            message: 'Test card sent and saved to mock data manager.',
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

export default router;