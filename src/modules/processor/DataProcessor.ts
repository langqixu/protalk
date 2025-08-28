import { Review, ProcessedReviews } from '../../types';
import logger from '../../utils/logger';

export class DataProcessor {
  /**
   * 处理评论数据，识别新增和更新的评论
   */
  static processReviews(
    apiReviews: Review[], 
    existingReviewIds: Set<string>
  ): ProcessedReviews {
    const newReviews: Review[] = [];
    const updatedReviews: Review[] = [];

    for (const review of apiReviews) {
      if (!existingReviewIds.has(review.id)) {
        // 新增评论
        newReviews.push(review);
        logger.debug('识别到新评论', { reviewId: review.id, appId: review.appId });
      } else {
        // 已存在的评论，检查是否有更新
        updatedReviews.push(review);
        logger.debug('识别到已存在评论', { reviewId: review.id, appId: review.appId });
      }
    }

    logger.info('数据处理完成', { 
      total: apiReviews.length,
      new: newReviews.length, 
      updated: updatedReviews.length 
    });

    return {
      new: newReviews,
      updated: updatedReviews
    };
  }

  /**
   * 构建增量查询参数
   */
  static buildIncrementalQuery(lastSyncTime: Date | null): string {
    if (!lastSyncTime) {
      return '';
    }

    // 格式化为ISO 8601格式，用于App Store API的filter参数
    const isoDate = lastSyncTime.toISOString();
    return `&filter[createdDate][ge]=${encodeURIComponent(isoDate)}`;
  }

  /**
   * 验证评论数据完整性
   */
  static validateReview(review: Review): boolean {
    const requiredFields = ['id', 'appId', 'rating', 'body', 'nickname', 'createdDate'];
    
    for (const field of requiredFields) {
      if (!review[field as keyof Review]) {
        logger.warn('评论数据缺少必需字段', { field, reviewId: review.id });
        return false;
      }
    }

    // 验证评分范围
    if (review.rating < 1 || review.rating > 5) {
      logger.warn('评论评分超出范围', { rating: review.rating, reviewId: review.id });
      return false;
    }

    // 验证日期格式
    if (!(review.createdDate instanceof Date) || isNaN(review.createdDate.getTime())) {
      logger.warn('评论创建日期格式无效', { reviewId: review.id });
      return false;
    }

    return true;
  }

  /**
   * 过滤无效评论
   */
  static filterValidReviews(reviews: Review[]): Review[] {
    const validReviews = reviews.filter(review => this.validateReview(review));
    
    const invalidCount = reviews.length - validReviews.length;
    if (invalidCount > 0) {
      logger.warn('过滤掉无效评论', { 
        total: reviews.length, 
        valid: validReviews.length, 
        invalid: invalidCount 
      });
    }

    return validReviews;
  }

  /**
   * 去重评论（基于ID）
   */
  static deduplicateReviews(reviews: Review[]): Review[] {
    const seen = new Set<string>();
    const uniqueReviews: Review[] = [];

    for (const review of reviews) {
      if (!seen.has(review.id)) {
        seen.add(review.id);
        uniqueReviews.push(review);
      }
    }

    const duplicateCount = reviews.length - uniqueReviews.length;
    if (duplicateCount > 0) {
      logger.info('去除重复评论', { 
        original: reviews.length, 
        unique: uniqueReviews.length, 
        duplicates: duplicateCount 
      });
    }

    return uniqueReviews;
  }

  /**
   * 按创建时间排序评论（最新的在前）
   */
  static sortReviewsByDate(reviews: Review[]): Review[] {
    return [...reviews].sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime());
  }

  /**
   * 限制评论数量（防止内存溢出）
   */
  static limitReviews(reviews: Review[], maxCount: number = 1000): Review[] {
    if (reviews.length <= maxCount) {
      return reviews;
    }

    logger.warn('评论数量超过限制，进行截断', { 
      original: reviews.length, 
      limited: maxCount 
    });

    return reviews.slice(0, maxCount);
  }

  /**
   * 完整的评论数据处理流程
   */
  static processReviewBatch(
    apiReviews: Review[], 
    existingReviewIds: Set<string>,
    maxCount: number = 1000
  ): ProcessedReviews {
    // 1. 验证和过滤
    const validReviews = this.filterValidReviews(apiReviews);
    
    // 2. 去重
    const uniqueReviews = this.deduplicateReviews(validReviews);
    
    // 3. 限制数量
    const limitedReviews = this.limitReviews(uniqueReviews, maxCount);
    
    // 4. 排序
    const sortedReviews = this.sortReviewsByDate(limitedReviews);
    
    // 5. 分类处理
    return this.processReviews(sortedReviews, existingReviewIds);
  }
}
