/**
 * @file review.ts
 * @description Defines the data transfer objects (DTOs) and state enums for app reviews.
 * This file serves as the single source of truth for review-related data structures.
 */

/**
 * Defines the possible states of an interactive review card.
 */
export enum CardState {
  /**
   * Initial state for a new, unreplied review.
   * Displays a "Reply" button.
   */
  NO_REPLY = 'no_reply',

  /**
   * State when the user is actively composing a reply.
   * Displays a text input form with "Submit" and "Cancel" buttons.
   */
  REPLYING = 'replying',

  /**
   * State after a reply has been submitted.
   * Displays the developer's response and an "Edit" button.
   */
  REPLIED = 'replied',

  /**
   * State when the user is editing a previously submitted reply.
   * Displays a pre-filled text input form with "Update" and "Cancel" buttons.
   */
  EDITING_REPLY = 'editing_reply',
}

/**
 * 回复状态枚举
 */
export enum ReplyStatus {
  NONE = 'none',              // 无回复
  PENDING = 'pending',        // 提交中
  SUBMITTED = 'submitted',    // 已提交，等待发布
  PUBLISHED = 'published',    // 已发布
  FAILED = 'failed',          // 提交失败
  UPDATING = 'updating',      // 更新中
  DELETED = 'deleted'         // 已删除
}

/**
 * 应用商店特定数据
 */
export interface StoreSpecificData {
  // App Store Connect特定字段
  appstore?: {
    reviewResponseId?: string;    // 开发者回复的ID
    customerReviewId?: string;    // 原评论在ASC中的ID
    bundleId?: string;           // 应用Bundle ID
  };
  
  // Google Play特定字段（预留）
  googleplay?: {
    packageName?: string;        // 应用包名
    developerReplyId?: string;   // 开发者回复ID
    clusterId?: string;          // 评论聚类ID
  };
}

/**
 * 回复状态追踪
 */
export interface ReplyStatusInfo {
  status: ReplyStatus;           // 当前状态
  lastAttempt?: string;          // 最后尝试时间 (ISO 8601)
  errorMessage?: string;         // 错误信息
  retryCount?: number;           // 重试次数
  submittedAt?: string;          // 提交时间 (ISO 8601)
  publishedAt?: string;          // 发布时间 (ISO 8601)
}

/**
 * Data Transfer Object for an App Store Review.
 * This unified interface is used across the application to ensure consistency.
 */
export interface ReviewDTO {
  // --- Core Identifiers ---
  id: string;
  appId: string;
  appName: string;

  // --- Review Content ---
  rating: number; // 1 to 5
  title: string;
  body: string;
  author: string;
  
  // --- Metadata ---
  createdAt: string; // ISO 8601 date string
  version: string;
  countryCode: string; // e.g., "CN", "US"

  // --- Developer Response ---
  developerResponse?: {
    body: string;
    lastModified: string; // ISO 8601 date string
  };
  
  // --- Store Integration (新增) ---
  storeType?: 'appstore' | 'googleplay'; // 应用商店类型
  storeSpecificData?: StoreSpecificData;  // 商店特定数据
  replyStatus?: ReplyStatusInfo;          // 回复状态信息
  
  // --- Card-specific data (optional) ---
  messageId?: string;
}
