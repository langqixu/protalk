import { IDatabaseManager, IPusher } from '../types';
import { AppReview } from '../types';
import logger from '../utils/logger';

/**
 * 部署验证服务
 * 用于在部署后自动验证卡片功能是否正常
 */
export class DeploymentVerificationService {
  constructor(
    private db: IDatabaseManager,
    private pusher: IPusher
  ) {
    logger.info('部署验证服务初始化成功');
  }

  /**
   * 获取最新的N条评论（忽略推送状态）
   */
  async getLatestReviews(limit: number = 5): Promise<AppReview[]> {
    try {
      // 从数据库获取最新评论，直接使用 SupabaseManager 的客户端
      const supabaseManager = this.db as any;
      const { data, error } = await supabaseManager.client
        .from('app_reviews')
        .select('*')
        .order('created_date', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      // 转换数据库格式到 AppReview 格式
      const reviews: AppReview[] = (data || []).map((row: any) => ({
        reviewId: row.review_id,
        appId: row.app_id,
        rating: row.rating,
        title: row.title,
        body: row.body,
        reviewerNickname: row.reviewer_nickname || row.nickname,
        createdDate: new Date(row.created_date || row.created_at), // 使用 created_date 或 created_at
        isEdited: row.is_edited || false,
        territoryCode: row.territory || 'US',
        
        // 开发者回复信息
        responseBody: row.response_body,
        responseDate: row.response_date ? new Date(row.response_date) : undefined,

        // 推送状态（对于验证不重要）
        isPushed: row.is_pushed || false,
        pushType: (row.push_type as 'new' | 'historical' | 'updated') || 'new',
        
        // 内部字段
        firstSyncAt: new Date(row.created_at),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));

      logger.info('获取最新评论成功', { count: reviews.length });
      return reviews;
    } catch (error) {
      logger.error('获取最新评论失败', { 
        limit, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 推送验证评论（忽略推送状态）
   */
  async pushVerificationReviews(reviews: AppReview[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    logger.info('🧪 开始推送验证评论', { count: reviews.length });

    for (const review of reviews) {
      try {
        // 添加验证标识
        const reviewWithVerificationFlag = {
          ...review,
          // 添加验证标识，方便在卡片中识别
          title: `[验证] ${review.title || ''}`,
          isVerification: true
        };

        await this.pusher.pushReviewUpdate(reviewWithVerificationFlag, 'new');
        success++;
        
        logger.info('✅ 验证评论推送成功', { 
          reviewId: review.reviewId,
          rating: review.rating,
          title: review.title?.substring(0, 50)
        });

        // 推送间隔，避免频控
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${review.reviewId}: ${errorMsg}`);
        
        logger.error('❌ 验证评论推送失败', { 
          reviewId: review.reviewId,
          error: errorMsg
        });

        // 如果是频控错误，等待更长时间
        if (errorMsg.includes('frequency limit') || errorMsg.includes('rate limit')) {
          logger.warn('🚫 遇到频控，等待恢复...', { reviewId: review.reviewId });
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    }

    const result = { success, failed, errors };
    logger.info('🧪 验证评论推送完成', result);
    
    return result;
  }

  /**
   * 执行完整的部署验证流程
   */
  async runDeploymentVerification(): Promise<{
    reviewsFound: number;
    pushResult: {
      success: number;
      failed: number;
      errors: string[];
    };
    timestamp: string;
  }> {
    logger.info('🚀 开始执行部署验证流程');

    try {
      // 1. 获取最新5条评论
      const reviews = await this.getLatestReviews(5);
      
      if (reviews.length === 0) {
        logger.warn('⚠️ 数据库中没有找到评论数据');
        return {
          reviewsFound: 0,
          pushResult: { success: 0, failed: 0, errors: ['没有找到评论数据'] },
          timestamp: new Date().toISOString()
        };
      }

      logger.info('📋 找到验证评论', {
        count: reviews.length,
        latestDate: reviews[0]?.createdDate,
        ratings: reviews.map(r => r.rating)
      });

      // 2. 推送验证评论
      const pushResult = await this.pushVerificationReviews(reviews);

      // 3. 返回结果
      const result = {
        reviewsFound: reviews.length,
        pushResult,
        timestamp: new Date().toISOString()
      };

      logger.info('🎉 部署验证流程完成', result);
      return result;

    } catch (error) {
      logger.error('❌ 部署验证流程失败', { 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }
}
