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
      // 🔍 扩展字段：根据App Store Connect API文档补充
      territory?: string;           // 国家/地区代码 (如: US, CN, JP)
      storefront?: string;          // 商店前台标识符
    };
    relationships?: {
      response?: {
        data?: {
          type: string;
          id: string;
        };
      };
      appStoreVersion?: {
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
      // 对于 appStoreVersions
      versionString?: string;       // 版本号
      // 对于 customerReviewResponses
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
    // 🔍 增强API调用：包含更多相关数据
    let nextUrl: string | undefined = `/v1/apps/${appId}/customerReviews?sort=-createdDate&limit=100&include=response,appStoreVersion&fields[customerReviews]=rating,title,body,reviewerNickname,createdDate,isEdited,territory&fields[appStoreVersions]=versionString`;

    try {
      while (nextUrl) {
        const reviews = await this.fetchReviewsPage(nextUrl!);
        allReviews.push(...reviews);
        
        // 获取下一页URL
        const response: any = await this.httpClient.get(nextUrl);
        nextUrl = response.data.links?.next || undefined;
        
        logger.debug('获取评论页面', { 
          appId, 
          pageSize: reviews.length, 
          total: allReviews.length,
          hasNext: !!nextUrl 
        });
      }

      logger.info('App Store评论同步完成', { 
        appId, 
        totalReviews: allReviews.length 
      });
      
      return allReviews;
    } catch (error) {
      logger.error('App Store评论同步失败', { 
        appId, 
        error: error instanceof Error ? error.message : error 
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
    const versions = new Map<string, string>(); // 存储版本信息

    // 处理包含的数据
    if (response.included) {
      for (const item of response.included) {
        if (item.type === 'customerReviewResponses') {
          responses.set(item.id, {
            body: item.attributes.body,
            createdDate: item.attributes.createdDate
          });
        } else if (item.type === 'appStoreVersions' && item.attributes.versionString) {
          // 🔍 处理应用版本信息
          versions.set(item.id, item.attributes.versionString);
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
          
          // 🔍 新增扩展字段
          territoryCode: item.attributes.territory || undefined,
          appVersion: undefined, // 先设为undefined，下面会尝试从relationships获取
          
          firstSyncAt: new Date(),
          isPushed: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // 🔍 尝试获取版本信息
        if (item.relationships?.appStoreVersion?.data?.id) {
          const versionId = item.relationships.appStoreVersion.data.id;
          const versionString = versions.get(versionId);
          if (versionString) {
            review.appVersion = versionString;
            logger.debug('找到版本信息', { reviewId: item.id, version: versionString });
          }
        }

        // 添加回复信息（如果有）
        const responseData = responses.get(item.id);
        if (responseData) {
          review.responseBody = responseData.body;
          review.responseDate = new Date(responseData.createdDate);
        }

        logger.debug('转换评论数据', {
          reviewId: review.reviewId,
          territory: review.territoryCode,
          version: review.appVersion,
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
