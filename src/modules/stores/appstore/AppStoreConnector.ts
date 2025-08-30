/**
 * @file AppStoreConnector.ts
 * @description App Store Connect API集成，实现评论回复功能
 * @see https://developer.apple.com/documentation/appstoreconnectapi/customer_reviews
 */

import jwt from 'jsonwebtoken';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { IStoreConnector, ReplyResult, ReplyStatus, ReplyStatusResult } from '../interfaces/IStoreConnector';
import { AppReview } from '../../../types';
import logger from '../../../utils/logger';

/**
 * App Store Connect配置
 */
export interface AppStoreConnectConfig {
  issuerId: string;         // Issuer ID
  keyId: string;           // Key ID
  privateKey: string;      // 私钥内容
  bundleIds: string[];     // 支持的Bundle ID列表
  rateLimitPerMinute?: number;  // 每分钟请求限制，默认200
  timeout?: number;        // 请求超时时间，默认30秒
}

/**
 * App Store Connect API响应结构
 */
interface CustomerReviewResponse {
  data: {
    id: string;
    type: 'customerReviewResponses';
    attributes: {
      responseBody: string;
      state: 'PUBLISHED' | 'PENDING_PUBLISH';
    };
    relationships: {
      review: {
        data: {
          id: string;
          type: 'customerReviews';
        };
      };
    };
  };
}

interface CustomerReview {
  id: string;
  type: 'customerReviews';
  attributes: {
    rating: number;
    title?: string;
    body?: string;
    reviewerNickname: string;
    createdDate: string;
    territory: string;
  };
  relationships?: {
    response?: {
      data?: {
        id: string;
        type: 'customerReviewResponses';
      };
    };
  };
}

/**
 * App Store Connect连接器实现
 */
export class AppStoreConnector implements IStoreConnector {
  readonly storeType = 'appstore' as const;
  readonly storeName = 'App Store Connect';
  
  private httpClient: AxiosInstance;
  private config: AppStoreConnectConfig;
  private tokenCache: {
    token: string;
    expiresAt: number;
  } | null = null;

  constructor(config: AppStoreConnectConfig) {
    this.config = {
      rateLimitPerMinute: 200,
      timeout: 30000,
      ...config
    };

    this.httpClient = axios.create({
      baseURL: 'https://api.appstoreconnect.apple.com/v1',
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器：添加JWT认证
    this.httpClient.interceptors.request.use(async (config) => {
      const token = await this.getAuthToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // 响应拦截器：统一错误处理
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        logger.error('App Store Connect API错误', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url
        });
        throw error;
      }
    );

    logger.info('App Store Connect连接器初始化成功', {
      bundleIds: this.config.bundleIds,
      rateLimitPerMinute: this.config.rateLimitPerMinute
    });
  }

  /**
   * 生成JWT认证令牌
   */
  private async getAuthToken(): Promise<string> {
    const now = Date.now();
    
    // 检查令牌缓存
    if (this.tokenCache && this.tokenCache.expiresAt > now) {
      return this.tokenCache.token;
    }

    try {
      const payload = {
        iss: this.config.issuerId,
        iat: Math.floor(now / 1000),
        exp: Math.floor(now / 1000) + (20 * 60), // 20分钟过期
        aud: 'appstoreconnect-v1',
      };

      // 修复私钥格式 - 确保PEM格式正确
      let privateKey = this.config.privateKey;
      
      // 如果私钥缺少换行符，尝试修复
      if (!privateKey.includes('\n')) {
        privateKey = privateKey
          .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
          .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----')
          // 在Base64内容中每64个字符添加换行符
          .replace(/^-----BEGIN PRIVATE KEY-----\n(.+)\n-----END PRIVATE KEY-----$/s, (_match, content) => {
            const base64Content = content.replace(/\s/g, '');
            const formattedContent = base64Content.match(/.{1,64}/g)?.join('\n') || base64Content;
            return `-----BEGIN PRIVATE KEY-----\n${formattedContent}\n-----END PRIVATE KEY-----`;
          });
      }

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'ES256',
        keyid: this.config.keyId,
      });

      // 缓存令牌（提前5分钟过期）
      this.tokenCache = {
        token,
        expiresAt: now + (15 * 60 * 1000)
      };

      logger.debug('JWT令牌生成成功');
      return token;
    } catch (error) {
      logger.error('JWT令牌生成失败', { error });
      throw new Error('Failed to generate JWT token');
    }
  }

  /**
   * 同步评论数据（实现IReviewFetcher接口）
   */
  async syncReviews(appId: string): Promise<AppReview[]> {
    try {
      logger.info('开始同步App Store评论', { appId });

      // 查询应用的评论
      const response = await this.httpClient.get('/customerReviews', {
        params: {
          'filter[territory]': 'CHN', // 可以根据需要配置
          'include': 'response',
          'limit': 200
        }
      });

      const reviews: AppReview[] = response.data.data.map((review: CustomerReview) => 
        this.transformCustomerReviewToAppReview(review, appId)
      );

      logger.info('App Store评论同步完成', { 
        appId, 
        count: reviews.length 
      });

      return reviews;
    } catch (error) {
      logger.error('App Store评论同步失败', { appId, error });
      throw error;
    }
  }

  /**
   * 提交开发者回复（实现IReviewFetcher接口）
   */
  async replyToReview(reviewId: string, responseBody: string): Promise<{ success: boolean; responseDate: Date }> {
    try {
      logger.info('提交App Store开发者回复', { reviewId, responseLength: responseBody.length });

      const requestBody = {
        data: {
          type: 'customerReviewResponses',
          attributes: {
            responseBody: responseBody.trim()
          },
          relationships: {
            review: {
              data: {
                id: reviewId,
                type: 'customerReviews'
              }
            }
          }
        }
      };

      const response = await this.httpClient.post('/customerReviewResponses', requestBody);
      const responseData: CustomerReviewResponse = response.data;

      logger.info('App Store开发者回复提交成功', {
        reviewId,
        responseId: responseData.data.id,
        state: responseData.data.attributes.state
      });

      return {
        success: true,
        responseDate: new Date()
      };
    } catch (error) {
      logger.error('App Store开发者回复提交失败', { reviewId, error });
      return {
        success: false,
        responseDate: new Date()
      };
    }
  }

  /**
   * 更新已提交的回复
   */
  async updateReply(reviewId: string, responseBody: string): Promise<ReplyResult> {
    try {
      logger.info('更新App Store开发者回复', { reviewId });

      // 首先获取现有回复
      const existingResponse = await this.getExistingResponse(reviewId);
      if (!existingResponse) {
        throw new Error('找不到现有回复');
      }

      const requestBody = {
        data: {
          type: 'customerReviewResponses',
          id: existingResponse.id,
          attributes: {
            responseBody: responseBody.trim()
          }
        }
      };

      const response = await this.httpClient.patch(
        `/customerReviewResponses/${existingResponse.id}`, 
        requestBody
      );

      return {
        success: true,
        responseId: response.data.data.id,
        responseDate: new Date()
      };
    } catch (error) {
      logger.error('App Store开发者回复更新失败', { reviewId, error });
      return {
        success: false,
        responseDate: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 查询回复状态
   */
  async getReplyStatus(reviewId: string): Promise<ReplyStatusResult> {
    try {
      const response = await this.getExistingResponse(reviewId);
      
      if (!response) {
        return { status: ReplyStatus.NONE };
      }

      const status = response.attributes.state === 'PUBLISHED' 
        ? ReplyStatus.PUBLISHED 
        : ReplyStatus.PENDING;

      return {
        status,
        responseId: response.id,
        lastModified: new Date() // API没有提供具体的修改时间
      };
    } catch (error) {
      logger.error('查询App Store回复状态失败', { reviewId, error });
      return {
        status: ReplyStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 验证连接
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.getAuthToken();
      
      // 测试API调用
      const response = await this.httpClient.get('/customerReviews', {
        params: { limit: 1 }
      });

      logger.info('App Store Connect连接验证成功');
      return response.status === 200;
    } catch (error) {
      logger.error('App Store Connect连接验证失败', { error });
      return false;
    }
  }

  /**
   * 获取连接状态信息
   */
  async getConnectionInfo(): Promise<{
    connected: boolean;
    lastCheck: Date;
    error?: string;
    rateLimitRemaining?: number;
  }> {
    const lastCheck = new Date();
    
    try {
      const connected = await this.validateConnection();
      return {
        connected,
        lastCheck,
        rateLimitRemaining: this.config.rateLimitPerMinute // 简化实现
      };
    } catch (error) {
      return {
        connected: false,
        lastCheck,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 测试API权限
   */
  async testPermissions(): Promise<{
    canReadReviews: boolean;
    canReplyToReviews: boolean;
    canUpdateReplies: boolean;
    canDeleteReplies: boolean;
  }> {
    const permissions = {
      canReadReviews: false,
      canReplyToReviews: false,
      canUpdateReplies: false,
      canDeleteReplies: false
    };

    try {
      // 测试读取权限
      await this.httpClient.get('/customerReviews', { params: { limit: 1 } });
      permissions.canReadReviews = true;

      // 测试回复权限（通过读取现有回复来验证）
      await this.httpClient.get('/customerReviewResponses', { params: { limit: 1 } });
      permissions.canReplyToReviews = true;
      permissions.canUpdateReplies = true;
      
      // App Store Connect API目前不支持删除回复
      permissions.canDeleteReplies = false;

      logger.info('App Store Connect权限测试完成', permissions);
    } catch (error) {
      logger.warn('App Store Connect权限测试部分失败', { error, permissions });
    }

    return permissions;
  }

  /**
   * 获取现有回复
   */
  private async getExistingResponse(reviewId: string): Promise<any> {
    try {
      const response = await this.httpClient.get('/customerReviewResponses', {
        params: {
          'filter[review]': reviewId,
          limit: 1
        }
      });

      return response.data.data[0] || null;
    } catch (error) {
      logger.debug('获取现有回复失败或不存在', { reviewId });
      return null;
    }
  }

  /**
   * 转换App Store评论数据为AppReview格式
   */
  private transformCustomerReviewToAppReview(review: CustomerReview, appId: string): AppReview {
    return {
      reviewId: review.id,
      appId: appId,
      rating: review.attributes.rating,
      title: review.attributes.title || '',
      body: review.attributes.body || '',
      reviewerNickname: review.attributes.reviewerNickname,
      createdDate: new Date(review.attributes.createdDate),
      isEdited: false, // App Store API没有提供此信息
      
      // 开发者回复数据
      responseBody: null,
      responseDate: null,
      
      // 同步控制字段
      firstSyncAt: new Date(),
      isPushed: false,
      pushType: 'new',
      
      // 扩展字段
      territoryCode: review.attributes.territory,
      appVersion: undefined,
      reviewState: 'active',
      
      // 飞书相关字段
      feishuMessageId: undefined,
      cardState: 'initial',
      
      // 审计字段
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
