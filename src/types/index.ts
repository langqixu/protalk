// 基于App Store Connect API真实结构的评论数据类型
export interface AppReview {
  // 主键和标识
  reviewId: string;            // App Store Connect API的唯一ID，也是数据库主键
  appId: string;
  
  // App Store Connect API原始字段（保持命名一致）
  rating: number;              // 1-5星评分
  title?: string | null;       // 评论标题（API可选）
  body?: string | null;        // 评论内容
  reviewerNickname: string;    // 评论者昵称（API原始字段名）
  createdDate: Date;           // 评论创建时间（API原始字段名）
  isEdited: boolean;           // 是否编辑过（API原始字段）
  
  // 开发者回复数据（来自customerReviewResponses）
  responseBody?: string | null; // 开发者回复内容
  responseDate?: Date | null;   // 开发者回复时间
  
  // 二级定义字段（业务逻辑分类）
  // dataType 字段已移除，不再区分 review 和 rating_only
  
  // 同步控制字段
  firstSyncAt: Date;           // 首次同步时间
  isPushed: boolean;           // 是否已推送
  pushType?: 'new' | 'historical' | 'updated';
  
  // 扩展字段（预留）
  territoryCode?: string;      // 国家/地区代码
  appVersion?: string;         // 应用版本
  reviewState?: string;        // 评论状态
  
  // 审计字段
  createdAt: Date;
  updatedAt: Date;
}

// Review接口已废弃，统一使用AppReview

// AppFeedback类型已移除，统一使用AppReview

// 评分统计数据结构
export interface AppRatingDailyStats {
  id: string;
  appId: string;
  statDate: string;            // YYYY-MM-DD格式
  
  // 评分分布
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  
  // 统计指标
  totalRatings: number;        // 当日总评分数
  totalReviews: number;        // 当日评论数
  averageRating: number;       // 当日平均分
  
  // 趋势对比
  ratingChangeFromYesterday: number;  // 平均分环比变化
  ratingCountChange: number;          // 评分数量变化
  reviewCountChange: number;          // 评论数量变化
  
  // 推送状态
  isReportSent: boolean;       // 是否已发送日报
  reportSentAt?: Date;         // 日报发送时间
  
  // 审计字段
  createdAt: Date;
  updatedAt: Date;
}

// 商店配置
export interface StoreConfig {
  type: 'appstore' | 'googleplay';
  appId: string;
  enabled: boolean;
  name: string;
}

// 应用配置
export interface AppConfig {
  stores: StoreConfig[];
  sync: {
    interval?: string;
    batchSize?: number;
    maxRetries?: number;
    retryDelay?: number;
    reviews: {
      interval: string;
      batchSize: number;
      maxRetries: number;
      retryDelay: number;
      enableIncremental: boolean;
      pushNewReviews: boolean;
      pushUpdatedReviews: boolean;
      pushHistoricalReviews: boolean;
      markHistoricalAsPushed: boolean;
    };
    ratings: {
      dailyReportTime: string;
      aggregationPeriod: string;
      pushDailyReport: boolean;
      includeTrends: boolean;
      trendDays: number;
      enabled: boolean;
    };
  };
  api: {
    rateLimit: number;
    timeout: number;
  };
  features?: {
    unifiedDataModel?: boolean;
    smartPushNotifications?: boolean;
    contentChangeDetection?: boolean;
    historicalDataMigration?: boolean;
  };
}

// 环境配置
export interface EnvConfig {
  appStore: {
    issuerId: string;
    keyId: string;
    privateKey: string;
  };
  supabase: {
    url: string;
    anonKey: string;
  };
  feishu: {
    mode?: 'webhook' | 'eventsource';
    // API版本固定为v1，移除配置选项
    enableSignatureVerification?: boolean;
    appId?: string;
    appSecret?: string;
    verificationToken?: string;
    encryptKey?: string;
    batchSize?: number;
    retryAttempts?: number;
    processInterval?: number;
  };
  server: {
    port: number;
    apiKey?: string | undefined;
  };
}

// 统一的反馈抓取器接口
export interface IReviewFetcher {
  syncReviews(appId: string): Promise<AppReview[]>;  // 统一使用AppReview
  replyToReview(reviewId: string, responseBody: string): Promise<{ success: boolean; responseDate: Date }>;
}

// 数据库管理器接口（基于新的AppReview结构）
export interface IDatabaseManager {
  // 基础方法（基于新的AppReview结构）
  upsertAppReviews(reviews: AppReview[]): Promise<void>;
  getExistingReviewIds(appId: string): Promise<Set<string>>;
  getAppReviewsByIds(reviewIds: string[]): Promise<Map<string, AppReview>>;
  getLastSyncTime(appId: string): Promise<Date | null>;
  updateSyncTime(appId: string): Promise<void>;
  
  // 回复相关方法
  updateReply(reviewId: string, responseBody: string, responseDate: Date): Promise<void>;
  hasReply(reviewId: string): Promise<boolean>;
  
  // 数据类型查询方法 - 已移除，不再区分 review 和 rating_only
  // getReviewsByDataType 和 getReviewCountByType 方法已移除
  
  // 统一方法（移除向下兼容）
  
  // 评分统计相关方法
  saveDailyRatingStats?(stats: AppRatingDailyStats): Promise<void>;
  getDailyRatingStats?(appId: string, date: string): Promise<AppRatingDailyStats | null>;
  getRecentRatingTrends?(appId: string, days: number): Promise<AppRatingDailyStats[]>;
}

// 统一的推送器接口
export interface IPusher {
  // 统一使用AppReview
  pushReviewUpdate(review: AppReview, type: 'new' | 'update' | 'reply'): Promise<void>;
  pushBatchUpdates(reviews: AppReview[], type: 'new' | 'update' | 'reply'): Promise<void>;
  
  // 扩展功能
  pushDailyRatingReport?(appId: string, stats: AppRatingDailyStats): Promise<void>;
}

// 统一的数据处理器结果
export interface ProcessedReviews {
  new: AppReview[];
  updated: AppReview[];
}

// 同步结果类型
export interface SyncResult {
  total: number;
  new: number;
  updated: number;
  errors: string[];
}

// 评分日报推送结果
export interface DailyReportResult {
  success: boolean;
  reportSentAt: Date;
  error?: string;
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 回复请求类型
export interface ReplyRequest {
  review_id: string;
  response_body: string;
}

// 回复响应类型
export interface ReplyResponse {
  success: boolean;
  responseDate: Date;
}
