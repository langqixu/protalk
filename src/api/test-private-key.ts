/**
 * @file test-private-key.ts
 * @description 简单的私钥格式化测试端点
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

const router = Router();

// 简单的私钥测试端点
router.get('/private-key-test', async (_req: Request, res: Response) => {
  try {
    const originalKey = process.env['APP_STORE_PRIVATE_KEY'];
    
    if (!originalKey) {
      return res.json({
        success: false,
        error: '私钥环境变量未设置'
      });
    }

    // 显示原始私钥信息
    const originalInfo = {
      length: originalKey.length,
      hasNewlines: originalKey.includes('\n'),
      firstChars: originalKey.substring(0, 30),
      lastChars: originalKey.substring(originalKey.length - 30)
    };

    // 尝试我们的格式化逻辑
    let formattedKey = originalKey;
    
    if (!formattedKey.includes('\n')) {
      // 移除所有空白字符，然后重新格式化
      const cleanKey = formattedKey.replace(/\s/g, '');
      
      // 提取header, body, footer
      const headerMatch = cleanKey.match(/-----BEGIN[A-Z\s]+-----/);
      const footerMatch = cleanKey.match(/-----END[A-Z\s]+-----/);
      
      if (headerMatch && footerMatch) {
        const header = headerMatch[0];
        const footer = footerMatch[0];
        const bodyStart = cleanKey.indexOf(header) + header.length;
        const bodyEnd = cleanKey.indexOf(footer);
        const body = cleanKey.substring(bodyStart, bodyEnd);
        
        // 重新格式化：header + 换行 + 每64字符一行的body + 换行 + footer
        const formattedBody = body.match(/.{1,64}/g)?.join('\n') || body;
        formattedKey = `${header}\n${formattedBody}\n${footer}`;
      }
    }

    // 显示格式化后的私钥信息
    const formattedInfo = {
      length: formattedKey.length,
      hasNewlines: formattedKey.includes('\n'),
      lineCount: formattedKey.split('\n').length,
      firstLine: formattedKey.split('\n')[0],
      lastLine: formattedKey.split('\n')[formattedKey.split('\n').length - 1]
    };

    // 测试JWT生成
    let jwtResult;
    try {
      const payload = {
        iss: process.env['APP_STORE_ISSUER_ID'] || 'test-issuer',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (20 * 60),
        aud: 'appstoreconnect-v1',
      };

      const token = jwt.sign(payload, formattedKey, {
        algorithm: 'ES256',
        keyid: process.env['APP_STORE_KEY_ID'] || 'test-key-id'
      });

      jwtResult = {
        success: true,
        tokenLength: token.length,
        tokenPreview: token.substring(0, 50) + '...'
      };
    } catch (jwtError) {
      jwtResult = {
        success: false,
        error: jwtError instanceof Error ? jwtError.message : 'Unknown error'
      };
    }

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      originalKey: originalInfo,
      formattedKey: formattedInfo,
      jwtGeneration: jwtResult
    });

  } catch (error) {
    logger.error('私钥测试失败', { error });
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
