/**
 * @file MockDataManager.ts
 * @description 内存模拟数据管理器，提供与 SupabaseManager 相同的接口
 * 用于测试卡片交互逻辑，无需依赖真实数据库
 */

import { ReviewDTO } from '../../types/review';
import logger from '../../utils/logger';

export class MockDataManager {
  private reviews: Map<string, ReviewDTO> = new Map();
  private messageToReviewMap: Map<string, string> = new Map(); // messageId -> reviewId

  constructor() {
    logger.info('MockDataManager 初始化成功');
    this.initializeSampleData();
  }

  /**
   * 初始化一些示例数据用于测试
   */
  private initializeSampleData() {
    const sampleReviews: ReviewDTO[] = [
      {
        id: 'mock_review_001',
        appId: 'com.example.testapp',
        appName: 'Test App',
        rating: 5,
        title: '非常棒的应用！',
        body: '这个应用的设计很棒，功能也很实用。界面简洁美观，使用体验很好。',
        author: '满意用户',
        createdAt: new Date().toISOString(),
        version: '1.0.0',
        countryCode: 'CN',
      },
      {
        id: 'mock_review_002',
        appId: 'com.example.testapp',
        appName: 'Test App',
        rating: 2,
        title: '有些问题需要改进',
        body: '应用整体还可以，但是有一些小bug，希望能尽快修复。加载速度也有点慢。',
        author: '普通用户',
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1天前
        version: '1.0.0',
        countryCode: 'US',
      },
      {
        id: 'mock_review_003',
        appId: 'com.example.testapp',
        appName: 'Test App',
        rating: 4,
        title: '整体不错',
        body: '功能比较全面，使用起来还算顺手。如果能增加一些个性化设置就更好了。',
        author: '体验用户',
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2天前
        version: '0.9.5',
        countryCode: 'JP',
        developerResponse: {
          body: '感谢您的反馈！我们会在下个版本中增加更多个性化设置选项。',
          lastModified: new Date(Date.now() - 86400000).toISOString(),
        },
      },
    ];

    sampleReviews.forEach(review => {
      this.reviews.set(review.id, review);
    });

    logger.info('MockDataManager 示例数据初始化完成', { count: sampleReviews.length });
  }

  /**
   * 根据ID获取评论
   */
  async getReviewById(reviewId: string): Promise<ReviewDTO | null> {
    const review = this.reviews.get(reviewId);
    if (review) {
      logger.debug('MockDataManager: 找到评论', { reviewId });
      return { ...review }; // 返回副本
    } else {
      logger.warn('MockDataManager: 评论未找到', { reviewId });
      return null;
    }
  }

  /**
   * 保存评论（新增或更新）
   */
  async saveReview(review: ReviewDTO): Promise<void> {
    this.reviews.set(review.id, { ...review });
    logger.info('MockDataManager: 评论已保存', { reviewId: review.id });
  }

  /**
   * 更新评论回复
   */
  async updateReviewReply(reviewId: string, replyContent: string): Promise<void> {
    const review = this.reviews.get(reviewId);
    if (review) {
      review.developerResponse = {
        body: replyContent,
        lastModified: new Date().toISOString(),
      };
      this.reviews.set(reviewId, review);
      logger.info('MockDataManager: 评论回复已更新', { reviewId, replyLength: replyContent.length });
    } else {
      logger.error('MockDataManager: 无法更新回复，评论未找到', { reviewId });
      throw new Error(`Review ${reviewId} not found`);
    }
  }

  /**
   * 建立消息ID和评论ID的映射关系
   */
  async mapMessageToReview(messageId: string, reviewId: string): Promise<void> {
    this.messageToReviewMap.set(messageId, reviewId);
    logger.debug('MockDataManager: 消息映射已建立', { messageId, reviewId });
  }

  /**
   * 根据消息ID获取评论ID
   */
  async getReviewIdByMessageId(messageId: string): Promise<string | null> {
    const reviewId = this.messageToReviewMap.get(messageId);
    if (reviewId) {
      logger.debug('MockDataManager: 找到消息映射', { messageId, reviewId });
      return reviewId;
    } else {
      logger.warn('MockDataManager: 消息映射未找到', { messageId });
      return null;
    }
  }

  /**
   * 获取所有评论（用于调试）
   */
  async getAllReviews(): Promise<ReviewDTO[]> {
    return Array.from(this.reviews.values()).map(review => ({ ...review }));
  }

  /**
   * 清空所有数据（用于测试重置）
   */
  async clearAllData(): Promise<void> {
    this.reviews.clear();
    this.messageToReviewMap.clear();
    logger.info('MockDataManager: 所有数据已清空');
  }

  /**
   * 获取数据统计信息
   */
  async getStats(): Promise<{ reviewCount: number; mappingCount: number }> {
    return {
      reviewCount: this.reviews.size,
      mappingCount: this.messageToReviewMap.size,
    };
  }

  /**
   * 检查评论是否已有回复
   */
  async hasReply(reviewId: string): Promise<boolean> {
    const review = this.reviews.get(reviewId);
    return !!(review?.developerResponse?.body);
  }

  /**
   * 删除评论回复
   */
  async deleteReply(reviewId: string): Promise<void> {
    const review = this.reviews.get(reviewId);
    if (review) {
      delete review.developerResponse;
      this.reviews.set(reviewId, review);
      logger.info('MockDataManager: 评论回复已删除', { reviewId });
    } else {
      logger.error('MockDataManager: 无法删除回复，评论未找到', { reviewId });
      throw new Error(`Review ${reviewId} not found`);
    }
  }
}
