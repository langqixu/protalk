/**
 * @file ReplyManagerService.ts
 * @description 统一的回复管理服务，协调飞书卡片、数据库和应用商店API
 */

import { IStoreConnector } from '../modules/stores/interfaces/IStoreConnector';
import { storeConnectorFactory } from '../modules/stores/StoreConnectorFactory';
import { ReviewDTO, ReplyStatus, CardState } from '../types/review';
import { buildReviewCardV2 } from '../utils/feishu-card-v2-builder';
import logger from '../utils/logger';

/**
 * 数据管理器接口（复用现有定义）
 */
interface IDataManager {
  getReviewById(reviewId: string): Promise<ReviewDTO | null>;
  updateReviewReply(reviewId: string, replyContent: string): Promise<void>;
  saveReview(review: ReviewDTO): Promise<void>;
  mapMessageToReview?(messageId: string, reviewId: string): Promise<void>;
  getReviewIdByMessageId?(messageId: string): Promise<string | null>;
}

/**
 * 飞书服务接口（简化）
 */
interface IFeishuService {
  updateCardMessage(messageId: string, card: any): Promise<void>;
}

/**
 * 回复操作结果
 */
export interface ReplyOperationResult {
  success: boolean;
  reviewId: string;
  messageId?: string;
  newCardState: CardState;
  error?: string;
  replyStatus?: ReplyStatus;
}

/**
 * 统一回复管理服务
 */
export class ReplyManagerService {
  private connectors: Map<string, IStoreConnector> = new Map();
  private dataManager: IDataManager;
  private feishuService?: IFeishuService;

  constructor(
    dataManager: IDataManager,
    storeConfigs: any = {},
    feishuService?: IFeishuService
  ) {
    this.dataManager = dataManager;
    this.feishuService = feishuService;
    
    // 初始化应用商店连接器
    this.initializeStoreConnectors(storeConfigs);
  }

  /**
   * 初始化应用商店连接器
   */
  private initializeStoreConnectors(storeConfigs: any): void {
    try {
      if (storeConfigs.appstore?.enabled) {
        const appstoreConnector = storeConnectorFactory.create('appstore', storeConfigs);
        this.connectors.set('appstore', appstoreConnector);
        logger.info('App Store连接器初始化成功');
      }

      if (storeConfigs.googleplay?.enabled) {
        const googleplayConnector = storeConnectorFactory.create('googleplay', storeConfigs);
        this.connectors.set('googleplay', googleplayConnector);
        logger.info('Google Play连接器初始化成功');
      }

      logger.info('应用商店连接器初始化完成', { 
        connectors: Array.from(this.connectors.keys()) 
      });
    } catch (error) {
      logger.error('应用商店连接器初始化失败', { error });
    }
  }

  /**
   * 提交回复到应用商店
   */
  async submitReply(reviewId: string, replyContent: string, messageId?: string): Promise<ReplyOperationResult> {
    logger.info('开始提交回复', { reviewId, messageId, replyLength: replyContent.length });

    try {
      // 1. 获取评论数据
      const review = await this.dataManager.getReviewById(reviewId);
      if (!review) {
        throw new Error('评论数据未找到');
      }

      // 2. 更新数据库中的回复内容
      await this.dataManager.updateReviewReply(reviewId, replyContent);

      // 3. 更新评论对象
      review.developerResponse = {
        body: replyContent,
        lastModified: new Date().toISOString()
      };

      // 4. 确定应用商店类型
      const storeType = this.determineStoreType(review);
      review.storeType = storeType;

      // 5. 更新回复状态为提交中
      review.replyStatus = {
        status: ReplyStatus.PENDING,
        lastAttempt: new Date().toISOString(),
        retryCount: 0
      };

      // 6. 保存状态更新
      await this.dataManager.saveReview(review);

      // 7. 更新飞书卡片状态为"提交中"
      let newCardState = CardState.REPLIED;
      if (messageId && this.feishuService) {
        try {
          const submittingCard = buildReviewCardV2(review, CardState.REPLIED);
          await this.feishuService.updateCardMessage(messageId, submittingCard);
          logger.info('飞书卡片状态更新为已回复');
        } catch (error) {
          logger.warn('飞书卡片状态更新失败', { error });
        }
      }

      // 8. 异步提交到应用商店
      this.submitToStoreAsync(review, replyContent);

      return {
        success: true,
        reviewId,
        messageId,
        newCardState,
        replyStatus: ReplyStatus.PENDING
      };

    } catch (error) {
      logger.error('回复提交失败', { reviewId, error });
      
      // 更新失败状态
      try {
        const review = await this.dataManager.getReviewById(reviewId);
        if (review) {
          review.replyStatus = {
            status: ReplyStatus.FAILED,
            lastAttempt: new Date().toISOString(),
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            retryCount: (review.replyStatus?.retryCount || 0) + 1
          };
          await this.dataManager.saveReview(review);
        }
      } catch (updateError) {
        logger.error('更新失败状态失败', { updateError });
      }

      return {
        success: false,
        reviewId,
        messageId,
        newCardState: CardState.REPLIED,
        error: error instanceof Error ? error.message : 'Unknown error',
        replyStatus: ReplyStatus.FAILED
      };
    }
  }

  /**
   * 异步提交到应用商店
   */
  private async submitToStoreAsync(review: ReviewDTO, replyContent: string): Promise<void> {
    if (!review.storeType) {
      logger.warn('评论缺少应用商店类型信息', { reviewId: review.id });
      return;
    }

    const connector = this.connectors.get(review.storeType);
    if (!connector) {
      logger.warn('未找到对应的应用商店连接器', { 
        reviewId: review.id, 
        storeType: review.storeType 
      });
      return;
    }

    try {
      logger.info('开始提交到应用商店', { 
        reviewId: review.id, 
        storeType: review.storeType 
      });

      // 调用应用商店API
      const result = await connector.replyToReview(review.id, replyContent);

      // 更新状态
      review.replyStatus = {
        status: result.success ? ReplyStatus.SUBMITTED : ReplyStatus.FAILED,
        lastAttempt: new Date().toISOString(),
        submittedAt: result.success ? new Date().toISOString() : undefined,
        errorMessage: result.success ? undefined : 'Store API submission failed'
      };

      // 保存更新后的状态
      await this.dataManager.saveReview(review);

      // 更新飞书卡片（如果有消息ID）
      if (review.messageId && this.feishuService) {
        try {
          const updatedCard = buildReviewCardV2(review, CardState.REPLIED);
          await this.feishuService.updateCardMessage(review.messageId, updatedCard);
        } catch (error) {
          logger.warn('飞书卡片状态更新失败', { error });
        }
      }

      logger.info('应用商店回复提交完成', {
        reviewId: review.id,
        success: result.success,
        storeType: review.storeType
      });

    } catch (error) {
      logger.error('应用商店回复提交失败', {
        reviewId: review.id,
        storeType: review.storeType,
        error
      });

      // 更新失败状态
      review.replyStatus = {
        status: ReplyStatus.FAILED,
        lastAttempt: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        retryCount: (review.replyStatus?.retryCount || 0) + 1
      };

      try {
        await this.dataManager.saveReview(review);
      } catch (saveError) {
        logger.error('保存失败状态失败', { saveError });
      }
    }
  }

  /**
   * 同步回复状态
   */
  async syncReplyStatuses(): Promise<void> {
    logger.info('开始同步回复状态');

    for (const [storeType, connector] of this.connectors) {
      if (!connector.batchGetReplyStatus) {
        logger.debug(`${storeType}连接器不支持批量状态查询，跳过`);
        continue;
      }

      try {
        // 这里需要从数据库获取待同步的评论
        // 简化实现，实际应该查询状态为PENDING或SUBMITTED的评论
        logger.info(`正在同步${storeType}回复状态`);
        
        // TODO: 实现具体的状态同步逻辑
        // 1. 查询待同步的评论
        // 2. 批量查询应用商店状态
        // 3. 更新数据库状态
        // 4. 更新飞书卡片状态

      } catch (error) {
        logger.error(`${storeType}回复状态同步失败`, { error });
      }
    }

    logger.info('回复状态同步完成');
  }

  /**
   * 确定应用商店类型
   */
  private determineStoreType(_review: ReviewDTO): 'appstore' | 'googleplay' {
    // 简化逻辑：如果有App Store连接器，默认使用App Store
    if (this.connectors.has('appstore')) {
      return 'appstore';
    }
    
    if (this.connectors.has('googleplay')) {
      return 'googleplay';
    }

    // 默认App Store
    return 'appstore';
  }

  /**
   * 获取连接器状态
   */
  async getConnectorStatuses(): Promise<Map<string, any>> {
    const statuses = new Map();

    for (const [storeType, connector] of this.connectors) {
      try {
        const info = await connector.getConnectionInfo();
        statuses.set(storeType, info);
      } catch (error) {
        statuses.set(storeType, {
          connected: false,
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return statuses;
  }

  /**
   * 测试连接器权限
   */
  async testConnectorPermissions(): Promise<Map<string, any>> {
    const permissions = new Map();

    for (const [storeType, connector] of this.connectors) {
      try {
        const perms = await connector.testPermissions();
        permissions.set(storeType, perms);
      } catch (error) {
        permissions.set(storeType, {
          canReadReviews: false,
          canReplyToReviews: false,
          canUpdateReplies: false,
          canDeleteReplies: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return permissions;
  }

  /**
   * 获取支持的应用商店列表
   */
  getSupportedStores(): string[] {
    return Array.from(this.connectors.keys());
  }
}
