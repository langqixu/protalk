import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IDatabaseManager, AppReview } from '../../types';
import { EnvConfig } from '../../types';
import logger from '../../utils/logger';
import { ReviewDTO } from '../../types/review';

interface SupabaseConfig {
  supabase: EnvConfig['supabase'];
}

// 统一的数据库记录接口（基于最新表结构）
interface DatabaseAppReview {
  id?: string | null; // id字段可选，主键已改为review_id
  review_id: string;
  app_id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  reviewer_nickname: string;
  created_date: string;
  is_edited: boolean;
  response_body?: string | null;
  response_date?: string | null;
  // data_type 字段已从数据库移除
  first_sync_at: string;
  is_pushed: boolean;
  push_type?: 'new' | 'historical' | 'updated' | null;
  territory_code?: string | null;
  app_version?: string | null;
  review_state?: string | null;
  created_at: string;
  updated_at: string;
}

export class SupabaseManager implements IDatabaseManager {
  private client: SupabaseClient;

  constructor(config: SupabaseConfig) {
    this.client = createClient(config.supabase.url, config.supabase.anonKey);
    logger.info('Supabase客户端初始化成功');
  }

  /**
   * 批量插入或更新AppReview（新结构）
   * 使用review_id作为主键进行冲突检测
   */
  async upsertAppReviews(reviews: AppReview[]): Promise<void> {
    if (reviews.length === 0) {
      logger.debug('没有AppReview需要更新');
      return;
    }

    try {
      const dbReviews = reviews.map(review => this.transformAppReviewToDatabase(review));
      
      // 使用review_id作为主键进行upsert操作
      const { error } = await this.client
        .from('app_reviews')
        .upsert(dbReviews, { 
          onConflict: 'review_id',
          ignoreDuplicates: false 
        });

      if (error) {
        throw error;
      }

      logger.info('AppReview数据更新成功', { count: reviews.length });
    } catch (error) {
      logger.error('AppReview数据更新失败', { 
        error: error instanceof Error ? error.message : error,
        count: reviews.length 
      });
      throw error;
    }
  }

  // upsertReviews方法已移除，统一使用upsertAppReviews

  /**
   * 获取已存在的评论ID集合
   */
  async getExistingReviewIds(appId: string): Promise<Set<string>> {
    try {
      const { data, error } = await this.client
        .from('app_reviews')
        .select('review_id')
        .eq('app_id', appId);

      if (error) {
        throw error;
      }

      const reviewIds = new Set(data?.map(row => row.review_id) || []);
      logger.debug('获取已存在评论ID', { appId, count: reviewIds.size });
      
      return reviewIds;
    } catch (error) {
      logger.error('获取已存在评论ID失败', { 
        appId, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 获取最后同步时间
   */
  async getLastSyncTime(appId: string): Promise<Date | null> {
    try {
      const { data, error } = await this.client
        .from('sync_log')
        .select('last_sync_time')
        .eq('app_id', appId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // 没有找到记录，返回null
          logger.debug('没有找到同步记录', { appId });
          return null;
        }
        throw error;
      }

      const lastSyncTime = data?.last_sync_time ? new Date(data.last_sync_time) : null;
      logger.debug('获取最后同步时间', { appId, lastSyncTime });
      
      return lastSyncTime;
    } catch (error) {
      logger.error('获取最后同步时间失败', { 
        appId, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 更新同步时间
   */
  async updateSyncTime(appId: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('sync_log')
        .upsert({ 
          app_id: appId, 
          last_sync_time: new Date().toISOString() 
        }, { 
          onConflict: 'app_id' 
        });

      if (error) {
        throw error;
      }

      logger.debug('同步时间更新成功', { appId });
    } catch (error) {
      logger.error('同步时间更新失败', { 
        appId, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 更新评论回复
   */
  async updateReply(reviewId: string, responseBody: string, responseDate: Date): Promise<void> {
    try {
      const { error } = await this.client
        .from('app_reviews')
        .update({
          response_body: responseBody,
          response_date: responseDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('review_id', reviewId);

      if (error) {
        throw error;
      }

      logger.info('评论回复更新成功', { reviewId });
    } catch (error) {
      logger.error('评论回复更新失败', { 
        reviewId, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 检查评论是否已有回复
   */
  async hasReply(reviewId: string): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('app_reviews')
        .select('response_body')
        .eq('review_id', reviewId)
        .single();

      if (error) {
        throw error;
      }

      return !!data?.response_body;
    } catch (error) {
      logger.error('检查评论回复状态失败', { 
        reviewId, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 根据ID获取AppReview记录（用于变更检测）
   * 使用分批查询避免 414 Request-URI Too Large 错误
   */
  async getAppReviewsByIds(reviewIds: string[]): Promise<Map<string, AppReview>> {
    const result = new Map<string, AppReview>();

    if (reviewIds.length === 0) {
      return result;
    }

    // 分批处理，每批最多100个ID，避免URL过长
    const BATCH_SIZE = 100;
    const batches: string[][] = [];
    
    for (let i = 0; i < reviewIds.length; i += BATCH_SIZE) {
      batches.push(reviewIds.slice(i, i + BATCH_SIZE));
    }

    logger.debug('开始分批获取AppReview', { 
      totalIds: reviewIds.length,
      batchCount: batches.length,
      batchSize: BATCH_SIZE
    });

    try {
      // 并行处理所有批次
      const batchPromises = batches.map(async (batch, index) => {
        logger.debug(`处理批次 ${index + 1}/${batches.length}`, { batchSize: batch.length });
        
        const { data, error } = await this.client
          .from('app_reviews')
          .select('*')
          .in('review_id', batch);

        if (error) {
          logger.error(`批次 ${index + 1} 查询失败`, { error: error.message });
          throw error;
        }

        return data || [];
      });

      // 等待所有批次完成
      const batchResults = await Promise.all(batchPromises);
      
      // 合并所有结果
      let totalRecords = 0;
      for (const batchData of batchResults) {
        for (const dbRecord of batchData) {
          const appReview = this.transformDatabaseToAppReview(dbRecord);
          result.set(appReview.reviewId, appReview);
          totalRecords++;
        }
      }

      logger.info('批量获取AppReview成功', { 
        requestedCount: reviewIds.length,
        foundCount: result.size,
        batchCount: batches.length,
        totalRecords
      });

      return result;
    } catch (error) {
      logger.error('批量获取AppReview失败', { 
        reviewIds: reviewIds.slice(0, 5), // 只记录前5个ID
        totalCount: reviewIds.length,
        batchCount: batches.length,
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 按数据类型获取评论 - 已移除，不再区分 review 和 rating_only
   */
  // getReviewsByDataType 方法已移除

  /**
   * 获取评论数量统计（按类型） - 已移除，不再区分 review 和 rating_only
   */
  // getReviewCountByType 方法已移除

  /**
   * 将AppReview对象转换为数据库格式
   * 注意：id字段可以为空，主键已改为review_id
   */
  private transformAppReviewToDatabase(review: AppReview): DatabaseAppReview {
    return {
      // id 字段已从 AppReview 类型中移除，不再写入
      review_id: review.reviewId,
      app_id: review.appId,
      rating: review.rating,
      title: review.title || null,
      body: review.body || null,
      reviewer_nickname: review.reviewerNickname,
      created_date: review.createdDate.toISOString(),
      is_edited: review.isEdited,
      response_body: review.responseBody || null,
      response_date: review.responseDate?.toISOString() || null,
      // data_type 字段已从数据库移除
      first_sync_at: review.firstSyncAt.toISOString(),
      is_pushed: review.isPushed,
      push_type: review.pushType || null,
      territory_code: review.territoryCode || null,
      app_version: review.appVersion || null,
      review_state: review.reviewState || null,
      created_at: review.createdAt.toISOString(),
      updated_at: review.updatedAt.toISOString()
    };
  }

  /**
   * 将数据库记录转换为AppReview对象
   */
  private transformDatabaseToAppReview(dbRecord: any): AppReview {
    return {
      // id 字段已从 AppReview 类型中移除，不再读取
      reviewId: dbRecord.review_id,
      appId: dbRecord.app_id,
      rating: dbRecord.rating,
      title: dbRecord.title || null,
      body: dbRecord.body || null,
      reviewerNickname: dbRecord.reviewer_nickname,
      createdDate: new Date(dbRecord.created_date),
      isEdited: dbRecord.is_edited,
      responseBody: dbRecord.response_body || null,
      responseDate: dbRecord.response_date ? new Date(dbRecord.response_date) : null,
      // dataType 字段已从数据库移除
      firstSyncAt: new Date(dbRecord.first_sync_at),
      isPushed: dbRecord.is_pushed,
      pushType: dbRecord.push_type || null,
      territoryCode: dbRecord.territory_code || null,
      appVersion: dbRecord.app_version || null,
      reviewState: dbRecord.review_state || null,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: new Date(dbRecord.updated_at)
    };
  }

  // transformToDatabase方法已移除，统一使用transformAppReviewToDatabase

  /**
   * Retrieves a single review by its ID and converts to ReviewDTO format.
   */
  async getReviewById(reviewId: string): Promise<ReviewDTO | null> {
    try {
      const { data, error } = await this.client
        .from('app_reviews')
        .select('*')
        .eq('review_id', reviewId)
        .single();

      if (error) {
        logger.error('Error fetching review by ID', { reviewId, error });
        return null;
      }

      if (!data) {
        return null;
      }

      // Convert database record to ReviewDTO format
      return this.transformDatabaseToReviewDTO(data);
    } catch (error) {
      logger.error('Error in getReviewById', { reviewId, error });
      return null;
    }
  }

  /**
   * Updates the developer response for a given review.
   */
  async updateReviewReply(reviewId: string, replyContent: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('app_reviews')
        .update({ 
          response_body: replyContent, 
          response_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('review_id', reviewId);

      if (error) {
        logger.error('Error updating review reply', { reviewId, error });
        throw error;
      }
      
      logger.info('Successfully updated review reply', { reviewId, replyLength: replyContent.length });
    } catch (error) {
      logger.error('Error in updateReviewReply', { reviewId, error });
      throw error;
    }
  }

  /**
   * Saves a complete review object to the database.
   * This is primarily used for seeding test data.
   */
  async saveReview(review: ReviewDTO): Promise<void> {
    try {
      const { error } = await this.client
        .from('app_reviews')
        .upsert([
          {
            review_id: review.id,
            app_id: review.appId,
            title: review.title,
            body: review.body,
            rating: review.rating,
            reviewer_nickname: review.author,
            created_date: review.createdAt,
            app_version: review.version,
            territory_code: review.countryCode,
            response_body: review.developerResponse?.body || null,
            response_date: review.developerResponse?.lastModified || null,
            is_edited: false,
            first_sync_at: new Date().toISOString(),
            is_pushed: false,
            push_type: 'new',
            review_state: 'active',
            created_at: review.createdAt,
            updated_at: new Date().toISOString()
          }
        ]);

      if (error) {
        logger.error('Error saving review to Supabase', { error });
        throw error;
      }
      logger.info('Successfully saved review to Supabase', { reviewId: review.id });
    } catch (error) {
      logger.error('Error in saveReview', { reviewId: review.id, error });
      throw error;
    }
  }

  /**
   * Maps a Feishu message ID to a review ID by updating the review record.
   */
  async mapMessageToReview(messageId: string, reviewId: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('app_reviews')
        .update({ 
          feishu_message_id: messageId,
          updated_at: new Date().toISOString()
        })
        .eq('review_id', reviewId);

      if (error) {
        logger.error('Error mapping message to review', { messageId, reviewId, error });
        throw error;
      }
      
      logger.debug('Successfully mapped message to review', { messageId, reviewId });
    } catch (error) {
      logger.error('Error in mapMessageToReview', { messageId, reviewId, error });
      throw error;
    }
  }

  /**
   * Gets the review ID associated with a given Feishu message ID.
   */
  async getReviewIdByMessageId(messageId: string): Promise<string | null> {
    try {
      const { data, error } = await this.client
        .from('app_reviews')
        .select('review_id')
        .eq('feishu_message_id', messageId)
        .single();

      if (error) {
        logger.warn('No mapping found for message ID', { messageId });
        return null;
      }

      return data?.review_id || null;
    } catch (error) {
      logger.error('Error in getReviewIdByMessageId', { messageId, error });
      return null;
    }
  }

  /**
   * Transforms database record to ReviewDTO format.
   */
  private transformDatabaseToReviewDTO(dbRecord: any): ReviewDTO {
    return {
      id: dbRecord.review_id,
      appId: dbRecord.app_id,
      appName: this.getAppNameFromId(dbRecord.app_id), // 根据app_id获取应用名
      rating: dbRecord.rating,
      title: dbRecord.title || '',
      body: dbRecord.body || '',
      author: dbRecord.reviewer_nickname || '',
      createdAt: dbRecord.created_date || dbRecord.created_at,
      version: dbRecord.app_version || '1.0.0',
      countryCode: dbRecord.territory_code || 'CN',
      developerResponse: dbRecord.response_body ? {
        body: dbRecord.response_body,
        lastModified: dbRecord.response_date || dbRecord.updated_at
      } : undefined,
      messageId: dbRecord.feishu_message_id || undefined
    };
  }

  /**
   * 根据app_id获取应用名称
   * TODO: 可以从配置文件或其他数据源获取
   */
  private getAppNameFromId(appId: string): string {
    const appNameMap: { [key: string]: string } = {
      'com.test.app': '潮汐 for iOS',
      'com.moreless.tide': '潮汐 for iOS',
      // 可以添加更多应用映射
    };
    return appNameMap[appId] || 'Unknown App';
  }
}
