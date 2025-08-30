/**
 * @file review-card-controller.ts
 * @description Handles interactive events from Feishu review cards.
 */

import { CardState, ReviewDTO } from '../../types/review';
import { buildReviewCardV2 } from '../../utils/feishu-card-v2-builder';
import logger from '../../utils/logger';
// NOTE: We will need to inject FeishuService and a DatabaseService later.
// For now, we'll use mock data and functions.

// Mock database
const MOCK_DB: { [key: string]: ReviewDTO } = {};

async function getReview(reviewId: string): Promise<ReviewDTO | undefined> {
  return MOCK_DB[reviewId];
}

async function saveReview(review: ReviewDTO): Promise<void> {
  MOCK_DB[review.id] = review;
}

// Mock Feishu Service
async function updateCard(messageId: string, _card: any) {
  logger.info(`Updating card ${messageId} with new content.`);
  // In a real scenario, this would make an API call to Feishu.
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
