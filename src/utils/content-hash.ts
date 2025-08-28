import crypto from 'crypto';
import { AppReview } from '../types';

/**
 * 简化的内容变更检测器
 * 统一使用AppReview接口，移除向下兼容代码
 */
export class SimpleChangeDetector {
  /**
   * 为AppReview对象生成内容哈希
   */
  static generateContentHash(feedback: AppReview): string {
    // 包含可能变化的字段
    const contentString = JSON.stringify({
      rating: feedback.rating,
      title: feedback.title,
      body: feedback.body,
      reviewerNickname: feedback.reviewerNickname,
      isEdited: feedback.isEdited,
      responseBody: feedback.responseBody,
      responseDate: feedback.responseDate?.toISOString()
    });
    
    return crypto.createHash('md5').update(contentString).digest('hex');
  }

  /**
   * 检测两个AppReview对象之间的变更
   */
  static detectChanges(
    newFeedback: AppReview, 
    existingFeedback?: AppReview
  ): {
    hasChanged: boolean;
    changes: string[];
    newContentHash: string;
    existingContentHash?: string;
  } {
    const newContentHash = this.generateContentHash(newFeedback);
    
    if (!existingFeedback) {
      return {
        hasChanged: true,
        changes: ['new_feedback'],
        newContentHash,
        existingContentHash: undefined
      };
    }
    
    const existingContentHash = this.generateContentHash(existingFeedback);
    const hasChanged = newContentHash !== existingContentHash;
    
    const changes: string[] = [];
    if (hasChanged) {
      // 检测具体变更字段
      if (newFeedback.rating !== existingFeedback.rating) {
        changes.push('rating');
      }
      if (newFeedback.title !== existingFeedback.title) {
        changes.push('title');
      }
      if (newFeedback.body !== existingFeedback.body) {
        changes.push('body');
      }
      if (newFeedback.reviewerNickname !== existingFeedback.reviewerNickname) {
        changes.push('reviewerNickname');
      }
      if (newFeedback.isEdited !== existingFeedback.isEdited) {
        changes.push('isEdited');
      }
      if (newFeedback.responseBody !== existingFeedback.responseBody) {
        changes.push('responseBody');
      }
      if (newFeedback.responseDate?.getTime() !== existingFeedback.responseDate?.getTime()) {
        changes.push('responseDate');
      }
    }
    
    return {
      hasChanged,
      changes,
      newContentHash,
      existingContentHash
    };
  }

  /**
   * 批量检测变更
   */
  static detectBatchChanges(
    newFeedbacks: AppReview[],
    existingFeedbacks: Map<string, AppReview>
  ): {
    newItems: AppReview[];
    changedItems: AppReview[];
    unchangedItems: AppReview[];
    summary: {
      total: number;
      new: number;
      changed: number;
      unchanged: number;
    };
  } {
    const newItems: AppReview[] = [];
    const changedItems: AppReview[] = [];
    const unchangedItems: AppReview[] = [];

    for (const newFeedback of newFeedbacks) {
      const existing = existingFeedbacks.get(newFeedback.reviewId);
      const result = this.detectChanges(newFeedback, existing);
      
      if (!existing) {
        newItems.push(newFeedback);
      } else if (result.hasChanged) {
        changedItems.push(newFeedback);
      } else {
        unchangedItems.push(newFeedback);
      }
    }

    return {
      newItems,
      changedItems,
      unchangedItems,
      summary: {
        total: newFeedbacks.length,
        new: newItems.length,
        changed: changedItems.length,
        unchanged: unchangedItems.length
      }
    };
  }
}