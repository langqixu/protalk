// 评论数据结构
export interface Review {
  id: string;
  appId: string;
  rating: number;
  title?: string | undefined;
  body: string;
  nickname: string;
  createdDate: Date;
  isEdited: boolean;
  responseBody?: string | undefined;
  responseDate?: Date | undefined;
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
    interval: string;
    batchSize: number;
    maxRetries: number;
    retryDelay: number;
  };
  api: {
    rateLimit: number;
    timeout: number;
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
    webhookUrl: string;
    mode?: 'webhook' | 'eventsource';
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

// 评论抓取器接口
export interface IReviewFetcher {
  syncReviews(appId: string): Promise<Review[]>;
  replyToReview(reviewId: string, responseBody: string): Promise<{ success: boolean; responseDate: Date }>;
}

// 数据库管理器接口
export interface IDatabaseManager {
  upsertReviews(reviews: Review[]): Promise<void>;
  getExistingReviewIds(appId: string): Promise<Set<string>>;
  getLastSyncTime(appId: string): Promise<Date | null>;
  updateReply(reviewId: string, responseBody: string, responseDate: Date): Promise<void>;
  updateSyncTime(appId: string): Promise<void>;
  hasReply(reviewId: string): Promise<boolean>;
}

// 推送器接口
export interface IPusher {
  pushReviewUpdate(review: Review, type: 'new' | 'update' | 'reply'): Promise<void>;
  pushBatchUpdates(reviews: Review[], type: 'new' | 'update' | 'reply'): Promise<void>;
}

// 数据处理器结果
export interface ProcessedReviews {
  new: Review[];
  updated: Review[];
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
