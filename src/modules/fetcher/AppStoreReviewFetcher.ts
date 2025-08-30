import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { IReviewFetcher, AppReview } from '../../types';
import { JWTManager } from '../../utils/jwt';
import { EnvConfig } from '../../types';
import { AppStoreErrorHandler } from '../../utils/app-store-error-handler';
import logger from '../../utils/logger';

interface AppStoreReviewResponse {
  data: Array<{
    id: string;
    type: string;
    attributes: {
      rating: number;
      title?: string;
      body: string;
      reviewerNickname: string;
      createdDate: string;
      isEdited: boolean;
    };
    relationships?: {
      response?: {
        data?: {
          type: string;
          id: string;
        };
      };
    };
  }>;
  included?: Array<{
    id: string;
    type: string;
    attributes: {
      body: string;
      createdDate: string;
    };
  }>;
  links?: {
    next?: string;
  };
}

interface AppStoreReviewFetcherConfig {
  appStore: EnvConfig['appStore'];
  api: {
    rateLimit: number;
    timeout: number;
  };
}

export class AppStoreReviewFetcher implements IReviewFetcher {
  private jwtManager: JWTManager;
  private httpClient: AxiosInstance;
  private baseUrl = 'https://api.appstoreconnect.apple.com';

  constructor(config: AppStoreReviewFetcherConfig) {
    this.jwtManager = new JWTManager(config.appStore);
    
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: config.api.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器：添加JWT token
    this.httpClient.interceptors.request.use((config) => {
      config.headers.Authorization = `Bearer ${this.jwtManager.getToken()}`;
      return config;
    });

    // 响应拦截器：处理错误和重试
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token过期，清除缓存
          this.jwtManager.clearCache();
          logger.warn('JWT token已过期，已清除缓存');
        }
        throw error;
      }
    );
  }

  /**
   * 同步评论数据
   */
  async syncReviews(appId: string): Promise<AppReview[]> {
    logger.info('开始同步App Store评论', { appId });
    
    const allReviews: AppReview[] = [];
    // 🔍 使用正确的App Store Connect API端点和参数
    let nextUrl: string | undefined = `/v1/apps/${appId}/customerReviews?sort=-createdDate&limit=50&include=response`;

    try {
      while (nextUrl) {
        logger.debug('正在获取评论页面', { appId, url: nextUrl });
        
        const reviews = await this.fetchReviewsPage(nextUrl);
        
        // 设置appId（因为API返回的数据中不包含appId）
        reviews.forEach(review => {
          review.appId = appId;
        });
        
        allReviews.push(...reviews);
        
        // 获取下一页URL
        const response: any = await this.httpClient.get(nextUrl);
        nextUrl = response.data.links?.next || undefined;
        
        logger.debug('获取评论页面完成', { 
          appId, 
          pageSize: reviews.length, 
          total: allReviews.length,
          hasNext: !!nextUrl 
        });
        
        // 限制每次最多获取200条评论（防止API超时）
        if (allReviews.length >= 200) {
          logger.info('已达到单次同步上限，停止获取更多评论', { 
            appId, 
            totalReviews: allReviews.length 
          });
          break;
        }
      }

      logger.info('App Store评论同步完成', { 
        appId, 
        totalReviews: allReviews.length 
      });
      
      return allReviews;
    } catch (error) {
      logger.error('App Store评论同步失败', { 
        appId, 
        error: error instanceof Error ? error.message : error,
        errorDetails: error
      });
      throw error;
    }
  }

  /**
   * 获取单页评论数据
   */
  private async fetchReviewsPage(url: string): Promise<AppReview[]> {
    try {
      const response: AxiosResponse<AppStoreReviewResponse> = await this.httpClient.get(url);
      return this.transformReviews(response.data);
    } catch (error) {
      logger.error('获取评论页面失败', { 
        url, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 转换App Store API响应为AppReview对象
   */
  private transformReviews(response: AppStoreReviewResponse): AppReview[] {
    const reviews: AppReview[] = [];
    const responses = new Map<string, { body: string; createdDate: string }>();

    // 处理回复数据
    if (response.included) {
      for (const item of response.included) {
        if (item.type === 'customerReviewResponses') {
          responses.set(item.id, {
            body: item.attributes.body,
            createdDate: item.attributes.createdDate
          });
        }
      }
    }

    // 处理评论数据
    for (const item of response.data) {
      if (item.type === 'customerReviews') {
        const review: AppReview = {
          reviewId: item.id,
          appId: '', // 将在外部设置
          rating: item.attributes.rating,
          title: item.attributes.title || null,
          body: item.attributes.body || null,
          reviewerNickname: item.attributes.reviewerNickname,
          createdDate: new Date(item.attributes.createdDate),
          isEdited: item.attributes.isEdited,
          
          // 暂时设为undefined，等API支持后再获取
          territoryCode: undefined,
          appVersion: undefined,
          
          firstSyncAt: new Date(),
          isPushed: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // 添加回复信息（如果有）
        const responseData = responses.get(item.id);
        if (responseData) {
          review.responseBody = responseData.body;
          review.responseDate = new Date(responseData.createdDate);
        }

        logger.debug('转换评论数据', {
          reviewId: review.reviewId,
          hasResponse: !!review.responseBody
        });

        reviews.push(review);
      }
    }

    return reviews;
  }

  /**
   * 回复评论 - 集成增强错误处理
   */
  async replyToReview(reviewId: string, responseBody: string): Promise<{ success: boolean; responseDate: Date }> {
    logger.info('开始回复App Store评论', { 
      reviewId, 
      responseLength: responseBody.length 
    });

    try {
      // 验证回复内容
      if (!responseBody || responseBody.trim().length === 0) {
        throw new Error('回复内容不能为空');
      }

      if (responseBody.length > 1000) {
        throw new Error('回复内容不能超过1000字符');
      }

      const payload = {
        data: {
          type: 'customerReviewResponses',
          attributes: {
            responseBody: responseBody.trim()
          },
          relationships: {
            review: {
              data: {
                type: 'customerReviews',
                id: reviewId
              }
            }
          }
        }
      };

      logger.debug('发送App Store API请求', { 
        reviewId, 
        payloadType: payload.data.type,
        url: '/v1/customerReviewResponses'
      });

      const response = await this.httpClient.post('/v1/customerReviewResponses', payload);

      if (!response.data?.data?.attributes?.lastModifiedDate) {
        throw new Error('API响应缺少必要的日期信息');
      }

      const responseDate = new Date(response.data.data.attributes.lastModifiedDate);
      
      logger.info('App Store评论回复成功', { 
        reviewId, 
        responseDate,
        responseId: response.data.data.id
      });
      
      return {
        success: true,
        responseDate
      };
    } catch (error) {
      // 使用增强的错误处理
      AppStoreErrorHandler.logError(error, {
        reviewId,
        userId: 'system',
        replyContent: responseBody.substring(0, 50) + '...'
      });

      const errorInfo = AppStoreErrorHandler.handleError(error);
      
      // 抛出用户友好的错误消息
      const enhancedError = new Error(errorInfo.userMessage);
      enhancedError.name = errorInfo.errorCode;
      (enhancedError as any).retryable = errorInfo.retryable;
      (enhancedError as any).technicalMessage = errorInfo.technicalMessage;
      
      throw enhancedError;
    }
  }
}
