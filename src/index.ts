import express from 'express';
import cron from 'node-cron';
import { loadConfig } from './config';
import { AppStoreReviewFetcher } from './modules/fetcher/AppStoreReviewFetcher';
import { SupabaseManager } from './modules/storage/SupabaseManager';
import { FeishuServiceV1 } from './services/FeishuServiceV1';
import { ReviewSyncService } from './services/ReviewSyncService';
import { SmartReviewSyncService } from './services/SmartReviewSyncService';
import feishuRoutes, { setFeishuService, setSupabaseManager } from './api/feishu-routes';
import { setControllerSupabaseService } from './api/controllers/review-card-controller';
import logger from './utils/logger';
// IPusher类型已通过FeishuServiceV1直接使用

async function main() {
  try {
    // 1. 加载配置
    logger.info('正在加载配置...');
    const { app: appConfig, env: envConfig } = loadConfig();
    
    logger.info('🚀 启动 Protalk 应用 - 飞书API版本: v1');
    
    // 2. 初始化核心模块
    logger.info('正在初始化核心模块...');
    
    const fetcher = new AppStoreReviewFetcher({
      appStore: envConfig.appStore,
      api: appConfig.api
    });
    
    const db = new SupabaseManager({
      supabase: envConfig.supabase
    });
    setControllerSupabaseService(db);
    setSupabaseManager(db); // 新增：注入到飞书路由中
    
    // 初始化飞书v1服务
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
      
      logger.info('✅ 飞书v1 API服务初始化完成', {
        mode: envConfig.feishu.mode || 'eventsource',
        signatureVerification: envConfig.feishu.enableSignatureVerification || false
      });
    }
    
    if (!feishuService) {
      logger.warn('⚠️  飞书服务未配置，将跳过消息推送功能');
    }
    
    // 3. 初始化评论同步服务
    let reviewSyncService: ReviewSyncService | SmartReviewSyncService | null = null;
    if (feishuService) {
      // 检查是否启用智能推送功能
      const useSmartPush = appConfig.features?.smartPushNotifications;
      
      if (useSmartPush) {
        // 使用智能同步服务
        reviewSyncService = new SmartReviewSyncService(
          fetcher,
          db,
          feishuService,
          {
            pushNewReviews: appConfig.sync.reviews.pushNewReviews,
            pushUpdatedReviews: appConfig.sync.reviews.pushUpdatedReviews,
            pushHistoricalReviews: appConfig.sync.reviews.pushHistoricalReviews,
            markHistoricalAsPushed: appConfig.sync.reviews.markHistoricalAsPushed,
            historicalThresholdHours: 24
          }
        );
        logger.info('✅ 智能评论同步服务初始化完成');
      } else {
        // 使用传统同步服务
        reviewSyncService = new ReviewSyncService(
          fetcher,
          db,
          feishuService
        );
        logger.info('✅ 传统评论同步服务初始化完成');
      }
      
      // 将ReviewSyncService注入到FeishuServiceV1中
      if (feishuService instanceof FeishuServiceV1) {
        feishuService.setReviewSyncService(reviewSyncService as ReviewSyncService);
        logger.info('✅ 已将ReviewSyncService注入到FeishuServiceV1');
      }
    } else {
      logger.warn('⚠️  飞书服务未配置，评论同步服务将不可用');
    }
    
    // 4. 创建Express应用
    const app = express();
    
    // 中间件配置
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    
    // 健康检查端点
    app.get('/health', (_req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '2.1.0',
        apiVersion: 'v1',
        feishuServiceType: 'v1'
      });
    });
    
    // 配置飞书v1 API路由
    if (feishuService) {
      setFeishuService(feishuService);
      // setControllerFeishuService(feishuService);
      app.use('/feishu', feishuRoutes);
      logger.info('🔗 已配置飞书v1 API路由');
    }
    
    // API认证中间件
    const apiAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const apiKey = req.headers['x-api-key'];
      
      logger.debug('API认证检查', { 
        providedKey: apiKey, 
        expectedKey: envConfig.server.apiKey,
        hasExpectedKey: !!envConfig.server.apiKey
      });
      
      if (!envConfig.server.apiKey || envConfig.server.apiKey === 'your_api_key_for_http_endpoints') {
        logger.warn('API认证未配置，跳过认证检查');
        return next();
      }
      
      if (!apiKey || apiKey !== envConfig.server.apiKey) {
        logger.warn('API认证失败', { 
          providedKey: apiKey ? '已提供但不匹配' : '未提供',
          ip: req.ip
        });
        return res.status(401).json({
          success: false,
          error: 'API认证失败，请提供有效的X-API-Key',
          code: 'UNAUTHORIZED'
        });
      }
      
      next();
    };
    
    // 评论同步API端点
    if (reviewSyncService) {
      app.post('/api/sync', apiAuthMiddleware, async (_req, res) => {
        try {
          logger.info('手动触发评论同步');
          const results = [];
          
          for (const store of appConfig.stores) {
            if (store.enabled) {
              const result = await reviewSyncService!.syncReviews(store.appId);
              results.push({ appId: store.appId, ...result });
            }
          }
          
          res.json({ success: true, results });
        } catch (error) {
          logger.error('手动同步失败', { error: (error as Error).message });
          res.status(500).json({ success: false, error: (error as Error).message });
        }
      });
      
      app.get('/api/sync/status', apiAuthMiddleware, (_req, res) => {
        res.json({
          success: true,
          enabled: !!reviewSyncService,
          stores: appConfig.stores.map(s => ({ appId: s.appId, name: s.name, enabled: s.enabled }))
        });
      });
    }
    
    // 5. 启动HTTP服务器
    const server = app.listen(envConfig.server.port, () => {
      logger.info(`🌐 HTTP服务器启动成功，端口: ${envConfig.server.port}`);
      logger.info(`🔗 健康检查: http://localhost:${envConfig.server.port}/health`);
      logger.info(`🤖 飞书API: http://localhost:${envConfig.server.port}/feishu/status`);
    });
    
    // 发送启动确认消息
    if (feishuService) {
      try {
        await feishuService.sendConfirmationMessage();
        logger.info('✅ 启动确认消息发送成功');
      } catch (error) {
        logger.warn('⚠️  启动确认消息发送失败，但不影响服务运行', { 
          error: error instanceof Error ? error.message : error 
        });
      }
    }
    
    // 6. 设置定时任务
    if (reviewSyncService) {
      const cronExpression = appConfig.sync.reviews.interval || '*/10 * * * *'; // 从配置文件读取同步间隔
      cron.schedule(cronExpression, async () => {
        try {
          logger.info('⏰ 开始定时同步评论');
          
          for (const store of appConfig.stores) {
            if (store.enabled) {
              try {
                const result = await reviewSyncService!.syncReviews(store.appId);
                logger.info('定时同步完成', { 
                  appId: store.appId,
                  name: store.name,
                  ...result 
                });
              } catch (error) {
                logger.error('单个应用同步失败', { 
                  appId: store.appId, 
                  name: store.name,
                  error: error instanceof Error ? error.message : error 
                });
              }
            }
          }
          
          logger.info('✅ 定时同步评论完成');
        } catch (error) {
          logger.error('❌ 定时同步评论失败', { 
            error: error instanceof Error ? error.message : error 
          });
        }
      });
      
      logger.info(`⏰ 定时任务已设置: ${cronExpression}`);
    } else {
      logger.warn('⚠️  评论同步服务未初始化，跳过定时任务设置');
    }
    
    // 7. 优雅关闭处理
    const gracefulShutdown = (signal: string) => {
      logger.info(`📥 收到${signal}信号，开始优雅关闭`);
      
      server.close((err) => {
        if (err) {
          logger.error('❌ 服务器关闭时发生错误', { error: err.message });
          process.exit(1);
        }
        
        logger.info('✅ 服务器已优雅关闭');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // 未捕获异常处理
    process.on('uncaughtException', (error) => {
      logger.error('💥 未捕获的异常', { error: error.message, stack: error.stack });
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('💥 未处理的Promise拒绝', { reason, promise });
      process.exit(1);
    });
    
    logger.info('🎉 Protalk应用启动完成');
    logger.info('📊 配置信息:', {
      port: envConfig.server.port,
      feishuApiVersion: 'v1',
      feishuMode: envConfig.feishu.mode || 'eventsource',
      signatureVerification: envConfig.feishu.enableSignatureVerification || false,
      storeCount: appConfig.stores.length
    });
    
  } catch (error) {
    logger.error('💥 应用启动失败', { 
      error: error instanceof Error ? error.message : error 
    });
    process.exit(1);
  }
}

// 启动应用
if (require.main === module) {
  main().catch((error) => {
    logger.error('💥 应用启动异常', { error: error.message });
    process.exit(1);
  });
}

export default main;
