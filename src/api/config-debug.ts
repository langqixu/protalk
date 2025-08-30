/**
 * @file config-debug.ts
 * @description 配置调试端点
 */

import { Router, Request, Response } from 'express';
import { loadConfig } from '../config';
import logger from '../utils/logger';

const router = Router();

// 配置调试端点
router.get('/config-debug', async (_req: Request, res: Response) => {
  try {
    logger.info('开始配置调试检查');
    
    // 1. 检查环境变量
    const envCheck = {
      APP_STORE_ISSUER_ID: !!process.env['APP_STORE_ISSUER_ID'],
      APP_STORE_KEY_ID: !!process.env['APP_STORE_KEY_ID'],
      APP_STORE_PRIVATE_KEY: !!process.env['APP_STORE_PRIVATE_KEY'],
      ENABLE_STORE_INTEGRATION: process.env['ENABLE_STORE_INTEGRATION'],
      APPSTORE_INTEGRATION_ENABLED: process.env['APPSTORE_INTEGRATION_ENABLED'],
      
      // 显示长度（不暴露实际内容）
      issuerId_length: process.env['APP_STORE_ISSUER_ID']?.length || 0,
      keyId_length: process.env['APP_STORE_KEY_ID']?.length || 0,
      privateKey_length: process.env['APP_STORE_PRIVATE_KEY']?.length || 0,
    };
    
    // 2. 加载配置
    let configResult: any = {};
    try {
      const { env: envConfig } = loadConfig();
      
      configResult = {
        success: true,
        appStore: {
          hasIssuerId: !!envConfig.appStore?.issuerId,
          hasKeyId: !!envConfig.appStore?.keyId,
          hasPrivateKey: !!envConfig.appStore?.privateKey,
          issuerId_length: envConfig.appStore?.issuerId?.length || 0,
          keyId_length: envConfig.appStore?.keyId?.length || 0,
          privateKey_length: envConfig.appStore?.privateKey?.length || 0,
        },
        stores: envConfig.stores ? {
          appstore: {
            enabled: envConfig.stores.appstore?.enabled,
            bundleIds: envConfig.stores.appstore?.bundleIds
          }
        } : null
      };
    } catch (configError) {
      configResult = {
        success: false,
        error: configError instanceof Error ? configError.message : 'Unknown error'
      };
    }
    
    return res.json({
      success: true,
      message: '配置调试信息',
      data: {
        environmentVariables: envCheck,
        loadedConfig: configResult,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('配置调试失败', { error });
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
