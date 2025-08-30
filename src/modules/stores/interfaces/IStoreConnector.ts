/**
 * @file IStoreConnector.ts
 * @description 应用商店连接器统一接口，支持多平台扩展
 * 基于现有的IReviewFetcher接口进行扩展，保持向后兼容
 */

import { AppReview } from '../../../types';

/**
 * 回复操作结果
 */
export interface ReplyResult {
  success: boolean;
  responseId?: string;        // 回复的唯一标识（如App Store的response ID）
  responseDate: Date;         // 回复提交时间
  error?: string;            // 错误信息
}

/**
 * 回复状态枚举
 */
export enum ReplyStatus {
  NONE = 'none',              // 无回复
  PENDING = 'pending',        // 提交中
  PUBLISHED = 'published',    // 已发布
  FAILED = 'failed',          // 提交失败
  UPDATING = 'updating',      // 更新中
  DELETED = 'deleted'         // 已删除
}

/**
 * 回复状态查询结果
 */
export interface ReplyStatusResult {
  status: ReplyStatus;
  responseId?: string;
  lastModified?: Date;
  error?: string;
}

/**
 * 应用商店特定配置
 */
export interface StoreSpecificConfig {
  // App Store Connect配置
  appstore?: {
    issuerId: string;
    keyId: string;
    privateKey: string;
    bundleIds: string[];
  };
  
  // Google Play配置（预留）
  googleplay?: {
    serviceAccountKey: string;
    packageNames: string[];
  };
}

/**
 * 统一的应用商店连接器接口
 * 扩展现有的IReviewFetcher，添加更丰富的回复管理功能
 */
export interface IStoreConnector {
  /**
   * 商店类型标识
   */
  readonly storeType: 'appstore' | 'googleplay' | 'huawei';
  
  /**
   * 商店名称（用于显示）
   */
  readonly storeName: string;
  
  // === 基础功能（兼容IReviewFetcher） ===
  
  /**
   * 同步评论数据
   * @param appId 应用ID
   * @returns 评论列表
   */
  syncReviews(appId: string): Promise<AppReview[]>;
  
  /**
   * 提交开发者回复
   * @param reviewId 评论ID
   * @param responseBody 回复内容
   * @returns 回复结果
   */
  replyToReview(reviewId: string, responseBody: string): Promise<{ success: boolean; responseDate: Date }>;
  
  // === 扩展功能 ===
  
  /**
   * 更新已提交的回复
   * @param reviewId 评论ID
   * @param responseBody 新的回复内容
   * @returns 更新结果
   */
  updateReply?(reviewId: string, responseBody: string): Promise<ReplyResult>;
  
  /**
   * 删除已提交的回复
   * @param reviewId 评论ID
   * @returns 删除结果
   */
  deleteReply?(reviewId: string): Promise<ReplyResult>;
  
  /**
   * 查询回复状态
   * @param reviewId 评论ID
   * @returns 回复状态
   */
  getReplyStatus?(reviewId: string): Promise<ReplyStatusResult>;
  
  /**
   * 批量查询回复状态
   * @param reviewIds 评论ID列表
   * @returns 回复状态映射
   */
  batchGetReplyStatus?(reviewIds: string[]): Promise<Map<string, ReplyStatusResult>>;
  
  // === 连接管理 ===
  
  /**
   * 验证连接配置
   * @returns 连接是否有效
   */
  validateConnection(): Promise<boolean>;
  
  /**
   * 获取连接状态信息
   * @returns 连接详情
   */
  getConnectionInfo(): Promise<{
    connected: boolean;
    lastCheck: Date;
    error?: string;
    rateLimitRemaining?: number;
  }>;
  
  /**
   * 测试API权限
   * @returns 权限检查结果
   */
  testPermissions(): Promise<{
    canReadReviews: boolean;
    canReplyToReviews: boolean;
    canUpdateReplies: boolean;
    canDeleteReplies: boolean;
  }>;
}

/**
 * 应用商店连接器工厂接口
 */
export interface IStoreConnectorFactory {
  /**
   * 创建连接器实例
   * @param storeType 商店类型
   * @param config 配置信息
   * @returns 连接器实例
   */
  create(storeType: string, config: StoreSpecificConfig): IStoreConnector;
  
  /**
   * 获取支持的商店类型
   * @returns 支持的商店类型列表
   */
  getSupportedStores(): string[];
  
  /**
   * 检查商店类型是否支持
   * @param storeType 商店类型
   * @returns 是否支持
   */
  isSupported(storeType: string): boolean;
}
