import { AppReview } from '../types';
import { SimpleChangeDetector } from './content-hash';
import logger from './logger';

/**
 * 智能推送管理器
 * 决定是否应该推送以及推送类型
 */
export class SmartPushManager {
  private static readonly HISTORICAL_DATA_THRESHOLD_HOURS = 24;
  
  /**
   * 判断是否应该推送反馈
   */
  static shouldPushFeedback(
    newFeedback: AppReview, 
    existingFeedback?: AppReview,
    config?: {
      pushNewReviews?: boolean;
      pushUpdatedReviews?: boolean;
      pushHistoricalReviews?: boolean;
      markHistoricalAsPushed?: boolean;
    }
  ): {
    shouldPush: boolean;
    pushType: 'new' | 'historical' | 'updated';
    reason: string;
  } {
    const defaultConfig = {
      pushNewReviews: true,
      pushUpdatedReviews: true,
      pushHistoricalReviews: true,
      markHistoricalAsPushed: true,
      ...config
    };
    
    // 情况1: 新数据
    if (!existingFeedback) {
      const isHistorical = this.isHistoricalData(newFeedback.firstSyncAt);
      
      if (isHistorical) {
        return {
          shouldPush: defaultConfig.pushHistoricalReviews,
          pushType: 'historical',
          reason: `历史数据 (${Math.round(this.getHoursSinceFirstSync(newFeedback.firstSyncAt))}小时前)`
        };
      } else {
        return {
          shouldPush: defaultConfig.pushNewReviews,
          pushType: 'new',
          reason: '新增反馈'
        };
      }
    }
    
    // 情况2: 检查内容变更
    const changeInfo = SimpleChangeDetector.detectChanges(newFeedback, existingFeedback);
    
    if (!changeInfo.hasChanged) {
      return {
        shouldPush: false,
        pushType: 'updated',
        reason: 'no_change'
      };
    }
    
    // 情况3: 有内容变更
    if (defaultConfig.pushUpdatedReviews) {
      return {
        shouldPush: true,
        pushType: 'updated',
        reason: changeInfo.changes.join(', ') || 'content_changed'
      };
    }
    
    return {
      shouldPush: false,
      pushType: 'updated',
      reason: '更新推送已禁用'
    };
  }
  
  /**
   * 批量处理推送决策
   */
  static processBatchPushDecisions(
    newFeedbacks: AppReview[],
    existingFeedbacks: Map<string, AppReview>,
    config?: any
  ): {
    toPush: { feedback: AppReview; pushType: 'new' | 'historical' | 'updated' }[];
    toSkip: { feedback: AppReview; reason: string }[];
    summary: {
      new: number;
      historical: number;
      updated: number;
      skipped: number;
    };
  } {
    const toPush: { feedback: AppReview; pushType: 'new' | 'historical' | 'updated' }[] = [];
    const toSkip: { feedback: AppReview; reason: string }[] = [];
    
    const summary = { new: 0, historical: 0, updated: 0, skipped: 0 };
    
    for (const feedback of newFeedbacks) {
      const existingFeedback = existingFeedbacks.get(feedback.reviewId);
      const decision = this.shouldPushFeedback(feedback, existingFeedback, config);
      
      if (decision.shouldPush) {
        toPush.push({ feedback, pushType: decision.pushType });
        summary[decision.pushType]++;
        
        logger.debug('决定推送反馈', {
          reviewId: feedback.reviewId,
          // dataType 字段已移除，不再区分 review 和 rating_only
          pushType: decision.pushType,
          reason: decision.reason
        });
      } else {
        toSkip.push({ feedback, reason: decision.reason });
        summary.skipped++;
        
        logger.debug('跳过推送反馈', {
          reviewId: feedback.reviewId,
          // dataType 字段已移除，不再区分 review 和 rating_only
          reason: decision.reason
        });
      }
    }
    
    return { toPush, toSkip, summary };
  }
  
  /**
   * 判断是否为历史数据
   */
  private static isHistoricalData(firstSyncAt: Date): boolean {
    const hoursSinceSync = this.getHoursSinceFirstSync(firstSyncAt);
    return hoursSinceSync > this.HISTORICAL_DATA_THRESHOLD_HOURS;
  }
  
  /**
   * 计算距离首次同步的小时数
   */
  private static getHoursSinceFirstSync(firstSyncAt: Date): number {
    return (Date.now() - firstSyncAt.getTime()) / (1000 * 60 * 60);
  }
  
  // shouldPushReview方法已移除，统一使用shouldPushFeedback
  
  /**
   * 生成推送统计报告
   */
  static generatePushReport(summary: any): string {
    const total = summary.new + summary.historical + summary.updated + summary.skipped;
    
    return [
      `📊 推送决策统计 (总计: ${total})`,
      `  🆕 新增: ${summary.new}`,
      `  📜 历史: ${summary.historical}`,
      `  🔄 更新: ${summary.updated}`,
      `  ⏭️  跳过: ${summary.skipped}`,
    ].join('\n');
  }
}

export default SmartPushManager;
