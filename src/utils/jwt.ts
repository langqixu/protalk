import jwt from 'jsonwebtoken';
import { EnvConfig } from '../types';
import logger from './logger';

export class JWTManager {
  private config: EnvConfig['appStore'];
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(config: EnvConfig['appStore']) {
    this.config = config;
  }

  /**
   * 处理私钥格式 - 确保PEM格式正确
   */
  private processPrivateKey(privateKey: string): string {
    // 首先处理转义字符
    let processedKey = privateKey.replace(/\\n/g, '\n');
    
    // 如果私钥缺少换行符，使用简单的替换方法
    if (!processedKey.includes('\n')) {
      // 简单替换：在header后和footer前添加换行符，body部分每64字符换行
      processedKey = processedKey
        .replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
        .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----');
      
      // 找到并格式化中间的Base64部分
      const lines = processedKey.split('\n');
      if (lines.length >= 3) {
        const header = lines[0];
        const footer = lines[lines.length - 1];
        const body = lines.slice(1, -1).join('').replace(/\s/g, '');
        
        // 将body每64字符分成一行
        const formattedBodyLines = [];
        for (let i = 0; i < body.length; i += 64) {
          formattedBodyLines.push(body.substring(i, i + 64));
        }
        
        processedKey = [header, ...formattedBodyLines, footer].join('\n');
      }
    }
    
    return processedKey;
  }

  /**
   * 生成App Store Connect API的JWT token
   */
  private generateToken(): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.config.issuerId,
      iat: now,
      exp: now + (20 * 60), // 20分钟过期
      aud: 'appstoreconnect-v1'
    };

    try {
      logger.debug('开始生成JWT token...');
      
      // 处理私钥中的转义字符
      const processedPrivateKey = this.processPrivateKey(this.config.privateKey);
      
      const token = jwt.sign(payload, processedPrivateKey, {
        algorithm: 'ES256',
        keyid: this.config.keyId
      });
      
      logger.debug('JWT token生成成功');
      return token;
    } catch (error) {
      logger.error('JWT token生成失败', { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error('JWT token生成失败');
    }
  }

  /**
   * 获取有效的JWT token（带缓存）
   */
  getToken(): string {
    const now = Date.now();
    
    // 检查缓存是否有效（提前5分钟刷新）
    if (this.tokenCache && this.tokenCache.expiresAt > now + (5 * 60 * 1000)) {
      return this.tokenCache.token;
    }

    // 生成新token
    const token = this.generateToken();
    this.tokenCache = {
      token,
      expiresAt: now + (20 * 60 * 1000) // 20分钟后过期
    };

    logger.info('JWT token已刷新');
    return token;
  }

  /**
   * 清除token缓存
   */
  clearCache(): void {
    this.tokenCache = null;
    logger.debug('JWT token缓存已清除');
  }
}
