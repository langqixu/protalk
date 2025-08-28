import express from 'express';
import cron from 'node-cron';
import { loadConfig } from './config';
import { AppStoreReviewFetcher } from './modules/fetcher/AppStoreReviewFetcher';
import { SupabaseManager } from './modules/storage/SupabaseManager';
import { FeishuService } from './modules/feishu/FeishuService';
import { ReviewSyncService } from './services/ReviewSyncService';
import { createRoutes } from './api/routes';
import { createFeishuRoutesV2 } from './api/feishu-routes-v2';
import logger from './utils/logger';

async function main() {
  try {
    // 1. 加载配置
    logger.info('正在加载配置...');
    const { app: appConfig, env: envConfig } = loadConfig();
    
    // 2. 初始化模块
    logger.info('正在初始化模块...');
    
    const fetcher = new AppStoreReviewFetcher({
      appStore: envConfig.appStore,
      api: appConfig.api
    });
    
    const db = new SupabaseManager({
      supabase: envConfig.supabase
    });
    
    // 初始化统一飞书服务
    let feishuService: FeishuService | null = null;
    if (envConfig.feishu.appId && envConfig.feishu.appSecret) {
      feishuService = new FeishuService({
        appId: envConfig.feishu.appId,
        appSecret: envConfig.feishu.appSecret,
        webhookUrl: envConfig.feishu.webhookUrl,
        mode: envConfig.feishu.mode || 'webhook',
        ...(envConfig.feishu.verificationToken && { verificationToken: envConfig.feishu.verificationToken }),
        ...(envConfig.feishu.encryptKey && { encryptKey: envConfig.feishu.encryptKey }),
        batchSize: envConfig.feishu.batchSize || 10,
        retryAttempts: envConfig.feishu.retryAttempts || 3,
        processInterval: envConfig.feishu.processInterval || 2000
      });
      
      // 初始化飞书服务
      await feishuService.initialize();
      logger.info('飞书服务初始化完成', {
        mode: feishuService.mode,
        status: feishuService.getConnectionStatus()
      });
    }
    
    // 创建同步服务，如果没有飞书服务则使用空pusher
    const syncService = new ReviewSyncService(fetcher, db, feishuService || {
      pushReviewUpdate: async () => {
        logger.debug('飞书服务未配置，跳过推送');
      },
      pushBatchUpdates: async () => {
        logger.debug('飞书服务未配置，跳过批量推送');
      }
    });
    
    // 3. 创建Express应用
    const app = express();
    
    // 中间件
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    
    // 请求日志
    app.use((req, _res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
    
    // 路由
    app.use('/api', createRoutes(syncService, envConfig.server.apiKey));
    if (feishuService) {
      app.use('/feishu', createFeishuRoutesV2(feishuService));
    }
    
    // 4. 启动定时任务
    logger.info('正在启动定时任务...');
    
    cron.schedule(appConfig.sync.interval, async () => {
      try {
        logger.info('开始执行定时同步任务');
        
        const enabledApps = appConfig.stores
          .filter(store => store.enabled && store.type === 'appstore')
          .map(store => store.appId);
        
        if (enabledApps.length === 0) {
          logger.warn('没有启用的应用需要同步');
          return;
        }
        
        const result = await syncService.syncAllApps(enabledApps);
        logger.info('定时同步任务完成', result);
      } catch (error) {
        logger.error('定时同步任务失败', { 
          error: error instanceof Error ? error.message : '未知错误' 
        });
      }
    });
    
    // 5. 启动服务器
    const port = envConfig.server.port;
    app.listen(port, () => {
      logger.info(`服务器启动成功，监听端口: ${port}`);
      logger.info(`健康检查: http://localhost:${port}/api/health`);
      logger.info(`API文档: http://localhost:${port}/api`);
    });
    
    // 6. 优雅关闭
    process.on('SIGTERM', () => {
      logger.info('收到SIGTERM信号，正在优雅关闭...');
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      logger.info('收到SIGINT信号，正在优雅关闭...');
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('应用启动失败', { 
      error: error instanceof Error ? error.message : '未知错误' 
    });
    process.exit(1);
  }
}

// 启动应用
main().catch((error) => {
  logger.error('应用启动异常', { 
    error: error instanceof Error ? error.message : '未知错误' 
  });
  process.exit(1);
});
