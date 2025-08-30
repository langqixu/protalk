/**
 * @file real-review-sync.ts
 * @description 真实App Store评论同步测试端点
 */

import { Router, Request, Response } from 'express';
import { AppStoreReviewFetcher } from '../modules/fetcher/AppStoreReviewFetcher';
import { SupabaseManager } from '../modules/storage/SupabaseManager';
import { FeishuServiceV1 } from '../services/FeishuServiceV1';
import { ReviewSyncService } from '../services/ReviewSyncService';
import { loadConfig } from '../config';
import logger from '../utils/logger';
import { getErrorDetails } from '../utils/error-handler';

const router = Router();

// 真实评论同步测试端点
router.post('/real-review-sync', async (req: Request, res: Response) => {
  try {
    const { appId } = req.body;
    const targetAppId = appId || '1077776989'; // 默认使用潮汐的App ID
    
    logger.info('开始真实评论同步测试', { targetAppId });
    
    // 1. 加载配置
    const { app: appConfig, env: envConfig } = loadConfig();
    
    // 2. 初始化核心组件
    const fetcher = new AppStoreReviewFetcher({
      appStore: envConfig.appStore,
      api: appConfig.api
    });
    
    const db = new SupabaseManager({
      supabase: envConfig.supabase
    });
    
    let feishuService: FeishuServiceV1 | null = null;
    if (envConfig.feishu.appId && envConfig.feishu.appSecret) {
      feishuService = new FeishuServiceV1({
        appId: envConfig.feishu.appId,
        appSecret: envConfig.feishu.appSecret,
        verificationToken: envConfig.feishu.verificationToken || '',
        encryptKey: envConfig.feishu.encryptKey || undefined,
        mode: envConfig.feishu.mode || 'eventsource',
        supabaseUrl: envConfig.supabase.url,
        supabaseKey: envConfig.supabase.anonKey,
        enableSignatureVerification: envConfig.feishu.enableSignatureVerification || false
      });
    }
    
    // 3. 创建同步服务
    if (!feishuService) {
      return res.status(500).json({
        success: false,
        error: '飞书服务未配置，无法进行评论推送'
      });
    }
    
    const syncService = new ReviewSyncService(fetcher, db, feishuService);
    
    // 4. 执行同步
    logger.info('开始从App Store Connect API获取真实评论', { targetAppId });
    
    const startTime = Date.now();
    const result = await syncService.syncReviews(targetAppId);
    const endTime = Date.now();
    
    logger.info('真实评论同步完成', { 
      targetAppId, 
      result, 
      duration: endTime - startTime 
    });
    
    return res.json({
      success: true,
      message: '真实评论同步完成',
      data: {
        appId: targetAppId,
        appName: '潮汐 for iOS',
        syncResult: result,
        duration: endTime - startTime,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('真实评论同步测试失败', { error });
    const errorDetails = getErrorDetails(error);
    
    return res.status(500).json({
      success: false,
      error: errorDetails.message,
      details: errorDetails.details,
      timestamp: new Date().toISOString()
    });
  }
});

// 获取真实评论数据预览端点
router.get('/real-reviews-preview/:appId?', async (req: Request, res: Response) => {
  try {
    const targetAppId = req.params['appId'] || '1077776989';
    
    logger.info('获取真实评论数据预览', { targetAppId });
    
    // 1. 加载配置
    const { app: appConfig, env: envConfig } = loadConfig();
    
    // 2. 初始化fetcher
    const fetcher = new AppStoreReviewFetcher({
      appStore: envConfig.appStore,
      api: appConfig.api
    });
    
    // 3. 直接调用API获取评论（不存储）
    const reviews = await fetcher.syncReviews(targetAppId);
    
    // 4. 格式化预览数据
    const preview = reviews.slice(0, 5).map(review => ({
      reviewId: review.reviewId,
      rating: review.rating,
      title: review.title,
      body: review.body?.substring(0, 100) + (review.body && review.body.length > 100 ? '...' : ''),
      reviewerNickname: review.reviewerNickname,
      createdDate: review.createdDate,
      hasResponse: !!review.responseBody
    }));
    
    return res.json({
      success: true,
      message: '真实评论数据预览',
      data: {
        appId: targetAppId,
        appName: '潮汐 for iOS',
        totalReviews: reviews.length,
        preview,
        sampleReview: reviews[0] || null,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('获取真实评论预览失败', { error });
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
