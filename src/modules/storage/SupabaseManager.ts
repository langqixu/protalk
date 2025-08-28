import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IDatabaseManager, AppReview } from '../../types';
import { EnvConfig } from '../../types';
import logger from '../../utils/logger';

interface SupabaseConfig {
  supabase: EnvConfig['supabase'];
}

// 统一的数据库记录接口（基于最新表结构）
interface DatabaseAppReview {
  id: string;
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
  data_type: 'review' | 'rating_only';
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
   * 按数据类型获取评论
   */
  async getReviewsByDataType(appId: string, dataType: 'review' | 'rating_only'): Promise<AppReview[]> {
    try {
      const { data, error } = await this.client
        .from('app_reviews')
        .select('*')
        .eq('app_id', appId)
        .eq('data_type', dataType)
        .order('created_date', { ascending: false });

      if (error) {
        throw error;
      }

      const reviews = data ? data.map(dbRecord => this.transformDatabaseToAppReview(dbRecord)) : [];
      
      logger.debug('按类型获取评论成功', { appId, dataType, count: reviews.length });
      return reviews;
    } catch (error) {
      logger.error('按类型获取评论失败', { 
        appId, 
        dataType,
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 获取评论数量统计（按类型）
   */
  async getReviewCountByType(appId: string): Promise<{review: number, rating_only: number}> {
    try {
      const { data, error } = await this.client
        .from('app_reviews')
        .select('data_type')
        .eq('app_id', appId);

      if (error) {
        throw error;
      }

      const counts = { review: 0, rating_only: 0 };
      
      if (data) {
        for (const record of data) {
          if (record.data_type === 'review') {
            counts.review++;
          } else if (record.data_type === 'rating_only') {
            counts.rating_only++;
          }
        }
      }

      logger.debug('评论类型统计完成', { appId, counts });
      return counts;
    } catch (error) {
      logger.error('评论类型统计失败', { 
        appId,
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 将AppReview对象转换为数据库格式
   * 注意：id字段可以为空，主键已改为review_id
   */
  private transformAppReviewToDatabase(review: AppReview): DatabaseAppReview {
    return {
      id: review.id,
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
      data_type: review.dataType,
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
      id: dbRecord.id,
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
      dataType: dbRecord.data_type,
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


}
