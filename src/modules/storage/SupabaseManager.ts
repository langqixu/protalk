import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IDatabaseManager, Review } from '../../types';
import { EnvConfig } from '../../types';
import logger from '../../utils/logger';

interface SupabaseConfig {
  supabase: EnvConfig['supabase'];
}

interface DatabaseReview {
  review_id: string;
  app_id: string;
  rating: number;
  title?: string | null;
  body: string;
  nickname: string;
  review_date: string;
  is_edited: boolean;
  response_body?: string | null;
  response_date?: string | null;
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
   * 批量插入或更新评论
   */
  async upsertReviews(reviews: Review[]): Promise<void> {
    if (reviews.length === 0) {
      logger.debug('没有评论需要更新');
      return;
    }

    try {
      const dbReviews = reviews.map(review => this.transformToDatabase(review));
      
      const { error } = await this.client
        .from('app_reviews')
        .upsert(dbReviews, { 
          onConflict: 'review_id',
          ignoreDuplicates: false 
        });

      if (error) {
        throw error;
      }

      logger.info('评论数据更新成功', { count: reviews.length });
    } catch (error) {
      logger.error('评论数据更新失败', { 
        error: error instanceof Error ? error.message : error,
        count: reviews.length 
      });
      throw error;
    }
  }

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
   * 将Review对象转换为数据库格式
   */
  private transformToDatabase(review: Review): DatabaseReview {
    return {
      review_id: review.id,
      app_id: review.appId,
      rating: review.rating,
      title: review.title || null,
      body: review.body,
      nickname: review.nickname,
      review_date: review.createdDate.toISOString(),
      is_edited: review.isEdited,
      response_body: review.responseBody || null,
      response_date: review.responseDate?.toISOString() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }


}
