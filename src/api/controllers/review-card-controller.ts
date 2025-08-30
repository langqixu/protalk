/**
 * @file review-card-controller.ts
 * @description Handles interactive events from Feishu review cards.
 */

import { CardState, ReviewDTO } from '../../types/review';
import { buildReviewCardV2 } from '../../utils/feishu-card-v2-builder';
import logger from '../../utils/logger';
// import { FeishuServiceV1 } from '../../services/FeishuServiceV1';
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
// let feishuService: FeishuServiceV1;
// export function setControllerFeishuService(service: FeishuServiceV1) {
//     feishuService = service;
// }

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
// 暂时注释掉未使用的函数
// async function updateCard(messageId: string, card: any) {
//     if (!feishuService) {
//         logger.error('FeishuService not initialized in controller!');
//         return;
//     }
//     logger.info(`Calling feishuService.updateCardMessage for ${messageId}`);
//     await feishuService.updateCardMessage(messageId, card);
// }

export async function handleCardAction(action: any, messageId: string): Promise<any> {
  const { action: nextState, review_id: reviewId } = action.value;

  logger.info('处理卡片交互', { nextState, reviewId, messageId });

  let review = await getReview(reviewId);

  if (!review) {
    logger.error(`Review with ID ${reviewId} not found in database.`);
    // 返回错误提示而不是静默失败
    return {
      toast: {
        type: 'error',
        content: '评论数据未找到，请刷新页面重试'
      }
    };
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
      // 直接返回更新后的卡片，而不是调用updateCard
      return {
        toast: {
          type: 'info',
          content: nextState === CardState.REPLYING ? '进入回复模式' : '状态已更新'
        },
        card: {
          type: 'raw',
          data: newCard
        }
      };

    case CardState.REPLIED:
      // This would handle form submission
      const replyContent = action.form_value?.reply_content || action.formValue?.reply_content || review.developerResponse?.body;
      if (!replyContent) {
        logger.error('回复内容为空', { action, form_value: action.form_value, formValue: action.formValue });
        return {
          toast: {
            type: 'error',
            content: '请输入回复内容'
          }
        };
      }
      
      logger.info('提交回复', { reviewId, replyLength: replyContent.length, replyContent });
      
      // 更新评论回复
      await updateReviewReply(reviewId, replyContent);
      
      // 重新获取更新后的评论数据
      const updatedReview = await getReview(reviewId);
      if (updatedReview) {
        updatedReview.messageId = messageId;
        const repliedCard = buildReviewCardV2(updatedReview, CardState.REPLIED);
        logger.info('回复提交成功并更新卡片');
        return {
          toast: {
            type: 'success',
            content: '回复提交成功！'
          },
          card: {
            type: 'raw',
            data: repliedCard
          }
        };
      }
      break;

    default:
      logger.warn(`Unhandled card action state: ${nextState}`);
      return {
        toast: {
          type: 'warning',
          content: '未知的操作状态'
        }
      };
  }
}
