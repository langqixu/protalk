/**
 * @file StoreConnectorFactory.ts
 * @description 应用商店连接器工厂，支持多平台动态创建
 */

import { IStoreConnector, IStoreConnectorFactory, StoreSpecificConfig } from './interfaces/IStoreConnector';
import { AppStoreConnector } from './appstore/AppStoreConnector';
import logger from '../../utils/logger';

/**
 * 应用商店连接器工厂实现
 */
export class StoreConnectorFactory implements IStoreConnectorFactory {
  private static instance: StoreConnectorFactory;
  
  /**
   * 获取工厂单例
   */
  static getInstance(): StoreConnectorFactory {
    if (!StoreConnectorFactory.instance) {
      StoreConnectorFactory.instance = new StoreConnectorFactory();
    }
    return StoreConnectorFactory.instance;
  }

  /**
   * 创建连接器实例
   */
  create(storeType: string, config: StoreSpecificConfig): IStoreConnector {
    logger.info('创建应用商店连接器', { storeType });

    switch (storeType.toLowerCase()) {
      case 'appstore':
        if (!config.appstore) {
          throw new Error('App Store配置缺失');
        }
        return new AppStoreConnector(config.appstore);

      case 'googleplay':
        // Google Play连接器暂未实现
        throw new Error('Google Play连接器暂未实现，敬请期待');

      case 'huawei':
        // 华为应用市场连接器暂未实现
        throw new Error('华为应用市场连接器暂未实现，敬请期待');

      default:
        throw new Error(`不支持的应用商店类型: ${storeType}`);
    }
  }

  /**
   * 获取支持的商店类型
   */
  getSupportedStores(): string[] {
    return ['appstore']; // 目前只支持App Store
  }

  /**
   * 检查商店类型是否支持
   */
  isSupported(storeType: string): boolean {
    return this.getSupportedStores().includes(storeType.toLowerCase());
  }

  /**
   * 批量创建连接器
   */
  createMultiple(configs: { [storeType: string]: StoreSpecificConfig }): Map<string, IStoreConnector> {
    const connectors = new Map<string, IStoreConnector>();

    for (const [storeType, config] of Object.entries(configs)) {
      try {
        if (this.isSupported(storeType)) {
          const connector = this.create(storeType, config);
          connectors.set(storeType, connector);
          logger.info('应用商店连接器创建成功', { storeType });
        } else {
          logger.warn('跳过不支持的应用商店', { storeType });
        }
      } catch (error) {
        logger.error('创建应用商店连接器失败', { 
          storeType, 
          error: error instanceof Error ? error.message : error 
        });
      }
    }

    logger.info('批量创建连接器完成', { 
      total: Object.keys(configs).length,
      successful: connectors.size 
    });

    return connectors;
  }

  /**
   * 验证配置有效性
   */
  validateConfig(storeType: string, config: StoreSpecificConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    switch (storeType.toLowerCase()) {
      case 'appstore':
        const appstoreConfig = config.appstore;
        if (!appstoreConfig) {
          errors.push('App Store配置缺失');
          break;
        }
        
        if (!appstoreConfig.issuerId) {
          errors.push('App Store Issuer ID缺失');
        }
        if (!appstoreConfig.keyId) {
          errors.push('App Store Key ID缺失');
        }
        if (!appstoreConfig.privateKey) {
          errors.push('App Store私钥缺失');
        }
        if (!appstoreConfig.bundleIds || appstoreConfig.bundleIds.length === 0) {
          errors.push('App Store Bundle ID列表为空');
        }
        break;

      case 'googleplay':
        const googleplayConfig = config.googleplay;
        if (!googleplayConfig) {
          errors.push('Google Play配置缺失');
          break;
        }
        
        if (!googleplayConfig.serviceAccountKey) {
          errors.push('Google Play服务账号密钥缺失');
        }
        if (!googleplayConfig.packageNames || googleplayConfig.packageNames.length === 0) {
          errors.push('Google Play包名列表为空');
        }
        break;

      default:
        errors.push(`不支持的应用商店类型: ${storeType}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取连接器信息
   */
  getConnectorInfo(storeType: string): {
    supported: boolean;
    description: string;
    requiredConfig: string[];
    features: string[];
  } {
    switch (storeType.toLowerCase()) {
      case 'appstore':
        return {
          supported: true,
          description: 'App Store Connect API集成',
          requiredConfig: ['issuerId', 'keyId', 'privateKey', 'bundleIds'],
          features: ['读取评论', '提交回复', '更新回复', '查询回复状态']
        };

      case 'googleplay':
        return {
          supported: false,
          description: 'Google Play Developer API集成（开发中）',
          requiredConfig: ['serviceAccountKey', 'packageNames'],
          features: ['读取评论', '提交回复']
        };

      default:
        return {
          supported: false,
          description: '未知的应用商店类型',
          requiredConfig: [],
          features: []
        };
    }
  }
}

/**
 * 导出工厂单例
 */
export const storeConnectorFactory = StoreConnectorFactory.getInstance();
