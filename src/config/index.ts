import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { AppConfig, EnvConfig } from '../types';
import logger from '../utils/logger';

// 加载环境变量
dotenv.config();

// 加载JSON配置文件
function loadAppConfig(): AppConfig {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config: AppConfig = JSON.parse(configData);
    
    // 验证配置
    if (!config.stores || !Array.isArray(config.stores)) {
      throw new Error('配置文件中缺少stores数组');
    }
    
    if (!config.sync || !config.api) {
      throw new Error('配置文件中缺少sync或api配置');
    }
    
    logger.info('应用配置加载成功', { storeCount: config.stores.length });
    return config;
  } catch (error) {
    logger.error('加载应用配置失败', { error: error instanceof Error ? error.message : error });
    throw error;
  }
}

// 加载环境配置
function loadEnvConfig(): EnvConfig {
  const requiredEnvVars = [
    'APP_STORE_ISSUER_ID',
    'APP_STORE_KEY_ID',
    'APP_STORE_PRIVATE_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`缺少必需的环境变量: ${missingVars.join(', ')}`);
  }

  const config: EnvConfig = {
    appStore: {
      issuerId: process.env['APP_STORE_ISSUER_ID']!,
      keyId: process.env['APP_STORE_KEY_ID']!,
      privateKey: process.env['APP_STORE_PRIVATE_KEY']!
    },
    supabase: {
      url: process.env['SUPABASE_URL']!,
      anonKey: process.env['SUPABASE_ANON_KEY']!
    },
    feishu: {
      mode: (process.env['FEISHU_MODE'] as 'webhook' | 'eventsource') || 'webhook',
      ...(process.env['FEISHU_APP_ID'] && { appId: process.env['FEISHU_APP_ID'] }),
      ...(process.env['FEISHU_APP_SECRET'] && { appSecret: process.env['FEISHU_APP_SECRET'] }),
      ...(process.env['FEISHU_VERIFICATION_TOKEN'] && { verificationToken: process.env['FEISHU_VERIFICATION_TOKEN'] }),
      ...(process.env['FEISHU_ENCRYPT_KEY'] && { encryptKey: process.env['FEISHU_ENCRYPT_KEY'] }),
      batchSize: parseInt(process.env['FEISHU_BATCH_SIZE'] || '10', 10),
      retryAttempts: parseInt(process.env['FEISHU_RETRY_ATTEMPTS'] || '3', 10),
      processInterval: parseInt(process.env['FEISHU_PROCESS_INTERVAL'] || '2000', 10),
    },
    server: {
      port: parseInt(process.env['PORT'] || '3000', 10),
      apiKey: process.env['API_KEY'] || undefined
    }
  };

  logger.info('环境配置加载成功');
  return config;
}

// 导出配置加载函数
export function loadConfig(): { app: AppConfig; env: EnvConfig } {
  const app = loadAppConfig();
  const env = loadEnvConfig();
  
  return { app, env };
}

// 导出配置对象（单例）
let configInstance: { app: AppConfig; env: EnvConfig } | null = null;

export function getConfig(): { app: AppConfig; env: EnvConfig } {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}
