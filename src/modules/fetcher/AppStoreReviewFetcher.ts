import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { IReviewFetcher, Review } from '../../types';
import { JWTManager } from '../../utils/jwt';
import { EnvConfig } from '../../types';
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
  async syncReviews(appId: string): Promise<Review[]> {
    logger.info('开始同步App Store评论', { appId });
    
    const allReviews: Review[] = [];
    let nextUrl: string | undefined = `/v1/apps/${appId}/customerReviews?sort=-createdDate&limit=100&include=response`;

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
  private async fetchReviewsPage(url: string): Promise<Review[]> {
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
   * 转换App Store API响应为Review对象
   */
  private transformReviews(response: AppStoreReviewResponse): Review[] {
    const reviews: Review[] = [];
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
        const review: Review = {
          id: item.id,
          appId: '', // 将在外部设置
          rating: item.attributes.rating,
          title: item.attributes.title || undefined,
          body: item.attributes.body,
          nickname: item.attributes.reviewerNickname,
          createdDate: new Date(item.attributes.createdDate),
          isEdited: item.attributes.isEdited,
        };

        // 添加回复信息（如果有）
        const response = responses.get(item.id);
        if (response) {
          review.responseBody = response.body;
          review.responseDate = new Date(response.createdDate);
        }

        reviews.push(review);
      }
    }

    return reviews;
  }

  /**
   * 回复评论
   */
  async replyToReview(reviewId: string, responseBody: string): Promise<{ success: boolean; responseDate: Date }> {
    logger.info('开始回复评论', { reviewId });

    try {
      const payload = {
        data: {
          type: 'customerReviewResponses',
          attributes: {
            responseBody: responseBody
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

      const response = await this.httpClient.post('/v1/customerReviewResponses', payload);

      const responseDate = new Date(response.data.data.attributes.lastModifiedDate);
      
      logger.info('评论回复成功', { reviewId, responseDate });
      
      return {
        success: true,
        responseDate
      };
    } catch (error) {
      logger.error('评论回复失败', { 
        reviewId, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }
}
