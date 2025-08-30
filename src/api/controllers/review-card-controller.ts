/**
 * @file review-card-controller.ts
 * @description Handles interactive events from Feishu review cards.
 */

import { CardState, ReviewDTO } from '../../types/review';
import { buildReviewCardV2 } from '../../utils/feishu-card-v2-builder';
import logger from '../../utils/logger';
import { FeishuServiceV1 } from '../../services/FeishuServiceV1';
import { SupabaseManager } from '../../modules/storage/SupabaseManager';
// import { MockDataManager } from '../../modules/storage/MockDataManager';

// 数据管理器接口，统一模拟和真实数据管理器
interface IDataManager {
  getReviewById(reviewId: string): Promise<ReviewDTO | null>;
  updateReviewReply(reviewId: string, replyContent: string): Promise<void>;
  saveReview(review: ReviewDTO): Promise<void>;
  mapMessageToReview?(messageId: string, reviewId: string): Promise<void>;
  getReviewIdByMessageId?(messageId: string): Promise<string | null>;
}

// This is a temporary solution for dependency injection.
// In a more complex app, we would use a proper DI framework.
let feishuService: FeishuServiceV1;
export function setControllerFeishuService(service: FeishuServiceV1) {
    feishuService = service;
}

let dataManager: IDataManager;
export function setControllerDataManager(manager: IDataManager) {
    dataManager = manager;
}

// 向后兼容的方法
export function setControllerSupabaseService(service: SupabaseManager) {
    dataManager = service;
}

async function getReview(reviewId: string): Promise<ReviewDTO | null> {
    if (!dataManager) {
        logger.error('DataManager not initialized in controller!');
        return null;
    }
    const review = await dataManager.getReviewById(reviewId);
    return review;
}

// async function saveReview(review: ReviewDTO): Promise<void> {
//     if (!dataManager) {
//         logger.error('DataManager not initialized in controller!');
//         return;
//     }
//     await dataManager.saveReview(review);
// }

async function updateReviewReply(reviewId: string, replyContent: string): Promise<void> {
    if (!dataManager) {
        logger.error('DataManager not initialized in controller!');
        return;
    }
    await dataManager.updateReviewReply(reviewId, replyContent);
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

  logger.info('处理卡片交互', { nextState, reviewId, messageId });

  let review = await getReview(reviewId);

  if (!review) {
    logger.error(`Review with ID ${reviewId} not found in database.`);
    // In a real app, you might want to send an error card back to the user.
    return;
  }
  
  // 建立消息ID和评论ID的映射关系（如果数据管理器支持）
  if (dataManager.mapMessageToReview) {
    await dataManager.mapMessageToReview(messageId, reviewId);
  }
  
  review.messageId = messageId;

  switch (nextState) {
    case CardState.REPLYING:
    case CardState.EDITING_REPLY:
    case CardState.NO_REPLY:
      logger.info(`切换卡片状态到: ${nextState}`);
      const newCard = buildReviewCardV2(review, nextState);
      await updateCard(messageId, newCard);
      break;

    case CardState.REPLIED:
      // This would handle form submission
      const replyContent = action.formValue?.reply_content || review.developerResponse?.body;
      if (!replyContent) {
        logger.error('回复内容为空');
        return;
      }
      
      logger.info('提交回复', { reviewId, replyLength: replyContent.length });
      
      // 更新评论回复
      await updateReviewReply(reviewId, replyContent);
      
      // 重新获取更新后的评论数据
      const updatedReview = await getReview(reviewId);
      if (updatedReview) {
        updatedReview.messageId = messageId;
        const repliedCard = buildReviewCardV2(updatedReview, CardState.REPLIED);
        await updateCard(messageId, repliedCard);
        logger.info('回复提交成功并更新卡片');
      }
      break;

    default:
      logger.warn(`Unhandled card action state: ${nextState}`);
  }
}
