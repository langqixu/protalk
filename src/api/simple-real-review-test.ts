/**
 * @file simple-real-review-test.ts  
 * @description 简单的真实评论获取测试（不需要认证）
 */

import { Router, Request, Response } from 'express';
import { AppStoreReviewFetcher } from '../modules/fetcher/AppStoreReviewFetcher';
import { loadConfig } from '../config';
import logger from '../utils/logger';
import { getErrorDetails } from '../utils/error-handler';

const router = Router();

// 简单的真实评论测试端点（无需认证）
router.get('/test-real-reviews', async (_req: Request, res: Response) => {
  try {
    logger.info('开始测试获取真实App Store评论');
    
    // 1. 加载配置
    const { app: appConfig, env: envConfig } = loadConfig();
    
    // 2. 检查配置是否完整
    if (!envConfig.appStore?.issuerId || !envConfig.appStore?.keyId || !envConfig.appStore?.privateKey) {
      return res.json({
        success: false,
        error: 'App Store Connect配置不完整',
        message: '请确保配置了ISSUER_ID、KEY_ID和PRIVATE_KEY'
      });
    }
    
    // 3. 初始化fetcher
    const fetcher = new AppStoreReviewFetcher({
      appStore: envConfig.appStore,
      api: appConfig.api
    });
    
    // 4. 测试获取潮汐App的评论（限制获取少量数据）
    const appId = '1077776989'; // 潮汐 for iOS
    logger.info('正在获取App Store评论', { appId });
    
    const startTime = Date.now();
    
    try {
      // 直接测试API调用
      const reviews = await fetcher.syncReviews(appId);
      const endTime = Date.now();
      
      // 处理结果
      const previewReviews = reviews.slice(0, 3).map(review => ({
        reviewId: review.reviewId,
        rating: review.rating,
        title: review.title,
        body: review.body?.substring(0, 50) + '...',
        reviewerNickname: review.reviewerNickname,
        createdDate: review.createdDate,
        hasResponse: !!review.responseBody
      }));
      
      return res.json({
        success: true,
        message: '成功获取真实App Store评论数据',
        data: {
          appId,
          appName: '潮汐 for iOS',
          totalReviews: reviews.length,
          sampleReviews: previewReviews,
          fullSampleReview: reviews[0] || null,
          executionTime: endTime - startTime,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (apiError) {
      logger.error('App Store API调用失败', { appId, error: apiError });
      const errorDetails = getErrorDetails(apiError);
      
      return res.json({
        success: false,
        error: 'App Store API调用失败',
        details: {
          message: errorDetails.message,
          statusCode: (apiError as any)?.response?.status,
          responseData: (apiError as any)?.response?.data
        },
        appId,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    logger.error('真实评论测试失败', { error });
    const errorDetails = getErrorDetails(error);
    
    return res.status(500).json({
      success: false,
      error: errorDetails.message,
      details: errorDetails.details,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
