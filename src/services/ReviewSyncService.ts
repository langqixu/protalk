import { IReviewFetcher, IDatabaseManager, IPusher, Review } from '../types';
import { DataProcessor } from '../modules/processor/DataProcessor';
import logger from '../utils/logger';

export class ReviewSyncService {
  constructor(
    private fetcher: IReviewFetcher,
    private db: IDatabaseManager,
    private pusher: IPusher
  ) {
    logger.info('评论同步服务初始化成功');
  }

  /**
   * 同步指定应用的评论
   */
  async syncReviews(appId: string): Promise<{
    total: number;
    new: number;
    updated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      logger.info('开始同步应用评论', { appId });

      // 1. 获取已存在的评论ID
      const existingReviewIds = await this.db.getExistingReviewIds(appId);
      logger.debug('获取已存在评论ID', { appId, count: existingReviewIds.size });

      // 2. 从API获取评论
      const apiReviews = await this.fetcher.syncReviews(appId);
      
      // 设置appId
      apiReviews.forEach(review => {
        review.appId = appId;
      });

      logger.info('从API获取评论完成', { appId, count: apiReviews.length });

      // 3. 处理评论数据
      const processed = DataProcessor.processReviewBatch(apiReviews, existingReviewIds);
      
      // 4. 更新数据库
      const allReviews = [...processed.new, ...processed.updated];
      if (allReviews.length > 0) {
        await this.db.upsertReviews(allReviews);
      }

      // 5. 推送新评论通知
      if (processed.new.length > 0) {
        await this.pusher.pushBatchUpdates(processed.new, 'new');
      }

      // 6. 推送更新评论通知
      if (processed.updated.length > 0) {
        await this.pusher.pushBatchUpdates(processed.updated, 'update');
      }

      // 7. 更新同步时间
      await this.db.updateSyncTime(appId);

      logger.info('应用评论同步完成', { 
        appId, 
        total: apiReviews.length,
        new: processed.new.length, 
        updated: processed.updated.length 
      });

      return {
        total: apiReviews.length,
        new: processed.new.length,
        updated: processed.updated.length,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      errors.push(errorMessage);
      
      logger.error('应用评论同步失败', { 
        appId, 
        error: errorMessage 
      });
      
      throw error;
    }
  }

  /**
   * 同步所有启用的应用
   */
  async syncAllApps(appIds: string[]): Promise<{
    totalApps: number;
    successApps: number;
    failedApps: string[];
    totalReviews: number;
    totalNew: number;
    totalUpdated: number;
  }> {
    const results = {
      totalApps: appIds.length,
      successApps: 0,
      failedApps: [] as string[],
      totalReviews: 0,
      totalNew: 0,
      totalUpdated: 0
    };

    logger.info('开始同步所有应用评论', { totalApps: appIds.length });

    for (const appId of appIds) {
      try {
        const result = await this.syncReviews(appId);
        
        results.successApps++;
        results.totalReviews += result.total;
        results.totalNew += result.new;
        results.totalUpdated += result.updated;
        
        logger.info('应用同步成功', { 
          appId, 
          total: result.total, 
          new: result.new, 
          updated: result.updated 
        });
      } catch (error) {
        results.failedApps.push(appId);
        logger.error('应用同步失败', { 
          appId, 
          error: error instanceof Error ? error.message : '未知错误' 
        });
      }
    }

    logger.info('所有应用同步完成', results);
    return results;
  }

  /**
   * 回复评论
   */
  async replyToReview(reviewId: string, responseBody: string): Promise<{
    success: boolean;
    responseDate: Date;
    error?: string;
  }> {
    try {
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

      // 获取评论详情用于推送
      // 注意：这里需要从数据库获取完整评论信息
      // 简化处理，推送回复通知
      const mockReview: Review = {
        id: reviewId,
        appId: '', // 需要从数据库获取
        rating: 0,
        body: '评论回复',
        nickname: '开发者',
        createdDate: new Date(),
        isEdited: false,
        responseBody: responseBody,
        responseDate: result.responseDate
      };

      // 推送回复通知
      await this.pusher.pushReviewUpdate(mockReview, 'reply');

      logger.info('评论回复成功', { reviewId, responseDate: result.responseDate });

      return {
        success: true,
        responseDate: result.responseDate
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      logger.error('评论回复失败', { 
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

  /**
   * 获取同步状态
   */
  async getSyncStatus(appId: string): Promise<{
    lastSyncTime: Date | null;
    totalReviews: number;
    hasRecentActivity: boolean;
  }> {
    try {
      const lastSyncTime = await this.db.getLastSyncTime(appId);
      const existingReviewIds = await this.db.getExistingReviewIds(appId);
      
      // 检查是否有最近活动（24小时内）
      const hasRecentActivity = lastSyncTime 
        ? (Date.now() - lastSyncTime.getTime()) < 24 * 60 * 60 * 1000
        : false;

      return {
        lastSyncTime,
        totalReviews: existingReviewIds.size,
        hasRecentActivity
      };
    } catch (error) {
      logger.error('获取同步状态失败', { 
        appId, 
        error: error instanceof Error ? error.message : '未知错误' 
      });
      throw error;
    }
  }
}
