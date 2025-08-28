import { 
  IReviewFetcher, 
  IDatabaseManager, 
  IPusher, 
  AppReview, 
  SyncResult 
} from '../types';
// SimpleChangeDetector已移除，直接使用AppReview
import { SmartPushManager } from '../utils/smart-push-manager';
import logger from '../utils/logger';

/**
 * 智能评论同步服务
 * 集成变更检测、推送状态跟踪和重复推送防护
 */
export class SmartReviewSyncService {
  constructor(
    private fetcher: IReviewFetcher,
    private db: IDatabaseManager,
    private pusher: IPusher,
    private config: {
      pushNewReviews: boolean;
      pushUpdatedReviews: boolean;
      pushHistoricalReviews: boolean;
      markHistoricalAsPushed: boolean;
      historicalThresholdHours: number;
    }
  ) {
    logger.info('智能评论同步服务初始化', { config: this.config });
  }

  /**
   * 智能同步应用评论
   */
  async syncReviews(appId: string): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      logger.info('🚀 开始智能同步应用评论', { appId });

      // 1. 从API获取最新评论
      const apiReviews = await this.fetcher.syncReviews(appId);
      logger.info('📥 API数据获取完成', { appId, count: apiReviews.length });

      // 2. 设置AppReview的appId
      const appReviews = apiReviews.map(review => ({ ...review, appId }));
      
      // 3. 获取现有数据进行变更检测
      const reviewIds = appReviews.map(r => r.reviewId);
      
      // 优化：如果数据库为空，跳过查询以避免网络问题
      let existingReviews = new Map<string, any>();
      if (reviewIds.length > 0) {
        try {
          existingReviews = await this.db.getAppReviewsByIds(reviewIds);
        } catch (error) {
          logger.warn('现有数据查询失败，假设为首次同步', { 
            error: error instanceof Error ? error.message : error,
            reviewCount: reviewIds.length 
          });
          // 继续执行，将所有评论视为新评论
        }
      }
      
      logger.info('💾 现有数据查询完成', { 
        appId, 
        newCount: appReviews.length,
        existingCount: existingReviews.size 
      });

      // 4. 执行智能变更检测和推送决策
      const pushDecisions = this.performSmartPushAnalysis(appReviews, existingReviews);
      
      // 5. 标记推送状态并更新数据库
      const updatedReviews = this.markReviewsForPush(appReviews, pushDecisions.toPush);
      await this.db.upsertAppReviews(updatedReviews);
      
      // 6. 执行智能推送
      await this.executePushOperations(pushDecisions.toPush);

      // 7. 更新同步时间
      await this.db.updateSyncTime(appId);

      const duration = Date.now() - startTime;
      const result: SyncResult = {
        total: appReviews.length,
        new: pushDecisions.summary.new + pushDecisions.summary.historical,
        updated: pushDecisions.summary.updated,
        errors: []
      };

      logger.info('✅ 智能同步完成', {
        appId,
        result,
        duration: `${duration}ms`,
        pushSummary: pushDecisions.summary
      });

      // 生成详细报告
      const pushReport = SmartPushManager.generatePushReport(pushDecisions.summary);
      logger.info('📊 智能推送报告', { appId, report: pushReport });

      return result;

    } catch (error) {
      // 改进错误处理，确保错误信息可读
      let errorMessage = '未知错误';
      let errorDetails = {};
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = {
          name: error.name,
          stack: error.stack?.split('\n').slice(0, 3).join('\n')
        };
      } else if (typeof error === 'object' && error !== null) {
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = '无法序列化的错误对象';
        }
      } else {
        errorMessage = String(error);
      }
      
      logger.error('❌ 智能同步失败', { 
        appId, 
        error: errorMessage,
        details: errorDetails
      });
      
      return {
        total: 0,
        new: 0,
        updated: 0,
        errors: [errorMessage]
      };
    }
  }

  // convertReviewsToAppReviews方法已移除，直接使用AppReview

  /**
   * 执行智能推送分析
   */
  private performSmartPushAnalysis(
    newReviews: AppReview[],
    existingReviews: Map<string, AppReview>
  ): {
    toPush: { review: AppReview; pushType: 'new' | 'historical' | 'updated' }[];
    toSkip: { review: AppReview; reason: string }[];
    summary: {
      new: number;
      historical: number;
      updated: number;
      skipped: number;
    };
  } {
    const toPush: { review: AppReview; pushType: 'new' | 'historical' | 'updated' }[] = [];
    const toSkip: { review: AppReview; reason: string }[] = [];
    const summary: Record<'new' | 'historical' | 'updated' | 'skipped', number> = { new: 0, historical: 0, updated: 0, skipped: 0 };

    for (const review of newReviews) {
      const existingReview = existingReviews.get(review.reviewId);
      
      // 使用SmartPushManager进行推送决策
      const decision = SmartPushManager.shouldPushFeedback(review, existingReview, this.config);
      
      if (decision.shouldPush) {
        toPush.push({ review, pushType: decision.pushType });
        summary[decision.pushType]++;
        
        logger.debug('✅ 决定推送', {
          reviewId: review.reviewId,
          pushType: decision.pushType,
          reason: decision.reason,
          dataType: review.dataType
        });
      } else {
        toSkip.push({ review, reason: decision.reason });
        summary.skipped++;
        
        logger.debug('⏭️ 跳过推送', {
          reviewId: review.reviewId,
          reason: decision.reason,
          dataType: review.dataType
        });
      }
    }

    logger.info('🧠 智能推送分析完成', { summary });
    return { toPush, toSkip, summary };
  }

  /**
   * 标记评论的推送状态
   */
  private markReviewsForPush(
    allReviews: AppReview[],
    toPush: Array<{ review: AppReview; pushType: string }>
  ): AppReview[] {
    const pushMap = new Map(
      toPush.map(item => [item.review.reviewId, item.pushType])
    );

    return allReviews.map(review => {
      const pushType = pushMap.get(review.reviewId);
      
      if (pushType) {
        review.isPushed = true;
        review.pushType = pushType as 'new' | 'historical' | 'updated';
        logger.debug('🏷️ 标记为已推送', { 
          reviewId: review.reviewId, 
          pushType 
        });
      } else {
        // 如果不需要推送，但之前也没推送过，标记为已推送（避免历史数据重复推送）
        if (!review.isPushed && this.isHistoricalData(review.firstSyncAt)) {
          review.isPushed = this.config.markHistoricalAsPushed;
          review.pushType = 'historical';
          logger.debug('🏷️ 标记历史数据为已推送', { 
            reviewId: review.reviewId 
          });
        }
      }
      
      return review;
    });
  }

  /**
   * 执行推送操作
   */
  private async executePushOperations(
    toPush: Array<{ review: AppReview; pushType: string }>
  ): Promise<void> {
    if (toPush.length === 0) {
      logger.info('📤 无需推送任何内容');
      return;
    }

    logger.info('📤 开始执行推送操作', { count: toPush.length });

    for (const { review, pushType } of toPush) {
      try {
        // 直接使用AppReview
        const reviewData = review;
        
        // 映射推送类型
        const mappedPushType = this.mapPushType(pushType);
        
        await this.pusher.pushReviewUpdate(reviewData, mappedPushType);
        
        logger.info('📤 推送成功', {
          reviewId: review.reviewId,
          // dataType 字段已移除，不再区分 review 和 rating_only
          pushType,
          mappedType: mappedPushType
        });
        
        // 避免推送过快
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        logger.error('📤 推送失败', {
          reviewId: review.reviewId,
          pushType,
          error: error instanceof Error ? error.message : error
        });
      }
    }
    
    logger.info('📤 推送操作完成');
  }

  /**
   * 映射推送类型到现有接口
   */
  private mapPushType(pushType: string): 'new' | 'update' | 'reply' {
    switch (pushType) {
      case 'new':
      case 'historical':
        return 'new';
      case 'updated':
        return 'update';
      default:
        return 'update';
    }
  }

  /**
   * 判断是否为历史数据
   */
  private isHistoricalData(firstSyncAt: Date): boolean {
    const hoursSinceSync = (Date.now() - firstSyncAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync > this.config.historicalThresholdHours;
  }

  /**
   * 获取同步统计信息
   */
  async getSyncStats(appId: string): Promise<{
    totalReviews: number;
    totalRatings: number;
    pushedCount: number;
    pendingPush: number;
    lastSyncTime: Date | null;
  }> {
    try {
      const counts = await this.db.getReviewCountByType(appId);
      const lastSyncTime = await this.db.getLastSyncTime(appId);
      
      // 这里可以进一步实现详细统计
      return {
        totalReviews: counts.review,
        totalRatings: counts.rating_only,
        pushedCount: 0, // 需要实现统计已推送数量的查询
        pendingPush: 0, // 需要实现统计待推送数量的查询
        lastSyncTime
      };
    } catch (error) {
      logger.error('获取同步统计失败', { appId, error });
      throw error;
    }
  }

  /**
   * 手动重新推送指定评论
   */
  async manualPush(reviewId: string): Promise<void> {
    try {
      const reviews = await this.db.getAppReviewsByIds([reviewId]);
      const review = reviews.get(reviewId);
      
      if (!review) {
        throw new Error(`评论 ${reviewId} 不存在`);
      }
      
      // 强制推送
      await this.pusher.pushReviewUpdate(review, 'update');
      
      logger.info('手动推送成功', { reviewId });
    } catch (error) {
      logger.error('手动推送失败', { reviewId, error });
      throw error;
    }
  }

  /**
   * 回复评论 - 委托给fetcher处理
   */
  async replyToReview(reviewId: string, responseBody: string): Promise<{
    success: boolean;
    responseDate: Date;
    error?: string;
  }> {
    try {
      logger.info('智能同步服务：开始处理评论回复', { reviewId });

      // 验证回复内容
      if (!responseBody || responseBody.trim().length === 0) {
        throw new Error('回复内容不能为空');
      }

      if (responseBody.length > 1000) {
        throw new Error('回复内容不能超过1000字符');
      }

      // 检查是否已有回复
      const hasReply = await this.db.hasReply(reviewId);
      if (hasReply) {
        throw new Error('该评论已有回复');
      }

      // 调用API回复评论
      const result = await this.fetcher.replyToReview(reviewId, responseBody);
      
      if (!result.success) {
        throw new Error('API回复失败');
      }

      // 更新数据库
      await this.db.updateReply(reviewId, responseBody, result.responseDate);

      // 获取完整的评论信息用于推送回复通知
      const reviewMap = await this.db.getAppReviewsByIds([reviewId]);
      const review = reviewMap.get(reviewId);
      
      if (review) {
        // 更新评论对象的回复信息
        review.responseBody = responseBody;
        review.responseDate = result.responseDate;
        review.updatedAt = new Date();
        
        // 推送回复通知
        await this.pusher.pushReviewUpdate(review, 'reply');
        
        logger.debug('回复通知推送成功', { reviewId });
      } else {
        logger.warn('未找到评论记录，跳过回复通知推送', { reviewId });
      }

      logger.info('智能同步服务：评论回复成功', { reviewId, responseDate: result.responseDate });

      return {
        success: true,
        responseDate: result.responseDate
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      logger.error('智能同步服务：评论回复失败', { 
        reviewId, 
        error: errorMessage 
      });

      return {
        success: false,
        responseDate: new Date(),
        error: errorMessage
      };
    }
  }
}

export default SmartReviewSyncService;
