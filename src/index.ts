import express from 'express';
import cron from 'node-cron';
import { loadConfig } from './config';
import { AppStoreReviewFetcher } from './modules/fetcher/AppStoreReviewFetcher';
import { SupabaseManager } from './modules/storage/SupabaseManager';
import { FeishuService } from './modules/feishu/FeishuService';
import { FeishuServiceV1 } from './services/FeishuServiceV1';
import { ReviewSyncService } from './services/ReviewSyncService';
import { createFeishuRoutesV2 } from './api/feishu-routes-v2';
import feishuRoutesV1, { initializeFeishuServiceV1 } from './api/feishu-routes-v1';
import logger from './utils/logger';
import { IPusher } from './types';

async function main() {
  try {
    // 1. 加载配置
    logger.info('正在加载配置...');
    const { app: appConfig, env: envConfig } = loadConfig();
    
    // 检查API版本配置
    const apiVersion = envConfig.feishu.apiVersion || 'v1';
    logger.info(`🚀 启动 Protalk 应用 - 飞书API版本: ${apiVersion}`);
    
    // 2. 初始化核心模块
    logger.info('正在初始化核心模块...');
    
    const fetcher = new AppStoreReviewFetcher({
      appStore: envConfig.appStore,
      api: appConfig.api
    });
    
    const db = new SupabaseManager({
      supabase: envConfig.supabase
    });
    
    // 根据配置初始化对应版本的飞书服务
    let feishuService: IPusher | null = null;
    let isV1Api = false;
    
    if (envConfig.feishu.appId && envConfig.feishu.appSecret) {
      if (apiVersion === 'v1') {
        // 使用v1 API服务
        const feishuServiceV1 = new FeishuServiceV1({
          appId: envConfig.feishu.appId,
          appSecret: envConfig.feishu.appSecret,
          verificationToken: envConfig.feishu.verificationToken || '',
          encryptKey: envConfig.feishu.encryptKey || undefined,
          mode: envConfig.feishu.mode || 'eventsource',
          supabaseUrl: envConfig.supabase.url,
          supabaseKey: envConfig.supabase.anonKey,
          enableSignatureVerification: envConfig.feishu.enableSignatureVerification || false
        });
        
        feishuService = feishuServiceV1;
        isV1Api = true;
        
        logger.info('✅ 飞书v1 API服务初始化完成', {
          mode: envConfig.feishu.mode || 'eventsource',
          signatureVerification: envConfig.feishu.enableSignatureVerification || false
        });
      } else {
        // 使用v4 API服务（向后兼容）
        const feishuServiceV4 = new FeishuService({
          appId: envConfig.feishu.appId,
          appSecret: envConfig.feishu.appSecret,
          mode: envConfig.feishu.mode || 'webhook',
          ...(envConfig.feishu.verificationToken && { verificationToken: envConfig.feishu.verificationToken }),
          ...(envConfig.feishu.encryptKey && { encryptKey: envConfig.feishu.encryptKey }),
          batchSize: envConfig.feishu.batchSize || 10,
          retryAttempts: envConfig.feishu.retryAttempts || 3,
          processInterval: envConfig.feishu.processInterval || 2000
        });
        
        // 初始化v4服务
        await feishuServiceV4.initialize();
        feishuService = feishuServiceV4;
        
        logger.info('✅ 飞书v4 API服务初始化完成', {
          mode: feishuServiceV4.mode,
          status: feishuServiceV4.getConnectionStatus()
        });
      }
    }
    
    if (!feishuService) {
      logger.warn('⚠️  飞书服务未配置，将跳过消息推送功能');
    }
    
    // 3. 初始化评论同步服务
    let reviewSyncService: ReviewSyncService | null = null;
    if (feishuService) {
      reviewSyncService = new ReviewSyncService(
        fetcher,
        db,
        feishuService
      );
      logger.info('✅ 评论同步服务初始化完成');
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
        version: '2.0.0',
        apiVersion: apiVersion,
        feishuServiceType: isV1Api ? 'v1' : 'v4'
      });
    });
    
    // 根据API版本配置对应的飞书路由
    if (isV1Api && feishuService) {
      // 使用完整的v1 API路由
      initializeFeishuServiceV1(feishuService as FeishuServiceV1);
      app.use('/feishu', feishuRoutesV1);
      logger.info('🔗 已配置飞书v1 API路由（完整版）');
    } else if (feishuService) {
      // 使用v4 API路由
      app.use('/feishu', createFeishuRoutesV2(feishuService as FeishuService));
      logger.info('🔗 已配置飞书v4 API路由');
    }
    
    // 评论同步API端点
    if (reviewSyncService) {
      app.post('/api/sync', async (_req, res) => {
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
      
      app.get('/api/sync/status', (_req, res) => {
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
        if (isV1Api) {
          await (feishuService as FeishuServiceV1).sendConfirmationMessage();
        } else {
          // v4版本的确认消息
          const chatId = 'oc_130c7aece1e0c64c817d4bc764d1b686';
          await (feishuService as FeishuServiceV1).sendTextMessage(chatId, `🚀 Protalk服务启动成功 - API版本: ${apiVersion}\n\n⏰ 启动时间: ${new Date().toLocaleString('zh-CN')}\n📊 监控状态: 已激活`);
        }
        logger.info('✅ 启动确认消息发送成功');
      } catch (error) {
        logger.warn('⚠️  启动确认消息发送失败，但不影响服务运行', { 
          error: error instanceof Error ? error.message : error 
        });
      }
    }
    
    // 6. 设置定时任务
    if (reviewSyncService) {
      const cronExpression = '*/10 * * * *'; // 每10分钟同步一次（稍微放宽间隔）
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
      feishuApiVersion: apiVersion,
      feishuMode: envConfig.feishu.mode || (isV1Api ? 'eventsource' : 'webhook'),
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
