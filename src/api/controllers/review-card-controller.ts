/**
 * @file review-card-controller.ts
 * @description Handles interactive events from Feishu review cards.
 */

import { CardState, ReviewDTO } from '../../types/review';
import { buildReviewCardV2 } from '../../utils/feishu-card-v2-builder';
import logger from '../../utils/logger';
import { FeishuServiceV1 } from '../../services/FeishuServiceV1';

// This is a temporary solution for dependency injection.
// In a more complex app, we would use a proper DI framework.
let feishuService: FeishuServiceV1;
export function setControllerFeishuService(service: FeishuServiceV1) {
    feishuService = service;
}

// Mock database
const MOCK_DB: { [key: string]: ReviewDTO } = {};

async function getReview(reviewId: string): Promise<ReviewDTO | undefined> {
  return MOCK_DB[reviewId];
}

async function saveReview(review: ReviewDTO): Promise<void> {
  MOCK_DB[review.id] = review;
}

// Use the real Feishu service
async function updateCard(messageId: string, card: any) {
    if (!feishuService) {
        logger.error('FeishuService not initialized in controller!');
        return;
    }
    logger.info(`Calling feishuService.updateCardMessage for ${messageId}`);
    await feishuService.updateCardMessage(messageId, card);
}

export async function handleCardAction(action: any, messageId: string) {
  const { action: nextState, review_id: reviewId } = action.value;

  let review = await getReview(reviewId);

  if (!review) {
    // If review not in DB, create a mock one for testing purposes
    review = {
      id: reviewId,
      appId: '12345',
      appName: '潮汐 for iOS',
      rating: 4,
      title: 'A Test Review',
      body: 'This is the body of the test review.',
      author: 'Test User',
      createdAt: new Date().toISOString(),
      version: '1.0.0',
      countryCode: 'US',
      messageId: messageId,
    };
    await saveReview(review);
  }
  
  review.messageId = messageId;

  switch (nextState) {
    case CardState.REPLYING:
    case CardState.EDITING_REPLY:
    case CardState.NO_REPLY:
      const newCard = buildReviewCardV2(review, nextState);
      await updateCard(messageId, newCard);
      break;

    case CardState.REPLIED:
      // This would handle form submission
      const replyContent = action.formValue?.reply_content || review.developerResponse?.body;
      review.developerResponse = {
        body: replyContent,
        lastModified: new Date().toISOString(),
      };
      await saveReview(review);
      const repliedCard = buildReviewCardV2(review, CardState.REPLIED);
      await updateCard(messageId, repliedCard);
      break;

    default:
      logger.warn(`Unhandled card action state: ${nextState}`);
  }
}
