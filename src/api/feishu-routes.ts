import { Router, Request, Response } from 'express';
import logger from '../utils/logger';
import { FeishuServiceV1 } from '../services/FeishuServiceV1';
import { handleCardAction } from './controllers/review-card-controller';
import { CardState, ReviewDTO } from '../types/review';
import { buildReviewCardV2 } from '../utils/feishu-card-v2-builder';

const router = Router();
let feishuService: FeishuServiceV1 | null = null;

export function setFeishuService(service: FeishuServiceV1) {
  feishuService = service;
}

// Main event handler for Feishu callbacks
router.post('/events', async (req: Request, res: Response) => {
  if (req.body.challenge) {
    return res.status(200).json({ challenge: req.body.challenge });
  }

  const { type, action, message_id } = req.body.event || {};
  if (type === 'interactive' && action && message_id) {
    try {
      await handleCardAction(action, message_id);
      return res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Error handling card action', { error, action });
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  return res.status(200).json({ success: true, message: 'Event received' });
});

// Unified test endpoint
router.post('/test/review-card', async (req: Request, res: Response) => {
    if (!feishuService) {
        return res.status(503).json({ success: false, error: 'Feishu service not initialized.' });
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
        const card = buildReviewCardV2(reviewData, CardState.NO_REPLY);
        const chatId = await feishuService.getFirstChatId();
        if (!chatId) {
            return res.status(404).json({ success: false, error: 'No available chat ID found.' });
        }
        await feishuService.sendCardMessage(chatId, card);
        return res.status(200).json({ success: true, message: 'Test card sent.' });
    } catch (error) {
        logger.error('Error in test endpoint', { error });
        return res.status(500).json({ success: false, error: 'Failed to send card' });
    }
});

export default router;