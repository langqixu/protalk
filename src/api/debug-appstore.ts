/**
 * @file debug-appstore.ts
 * @description App Store Connect API详细诊断工具
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import logger from '../utils/logger';
import { getErrorDetails } from '../utils/error-handler';

const router = Router();

// 详细的App Store Connect诊断端点
router.get('/appstore-detailed', async (_req: Request, res: Response) => {
  try {
    const results: any = {
      success: true,
      timestamp: new Date().toISOString(),
      diagnostics: {
        environment: {},
        jwtGeneration: {},
        apiConnection: {},
        apiPermissions: {}
      }
    };

    // 1. 检查环境变量
    results.diagnostics.environment = {
      hasIssuerId: !!process.env['APP_STORE_ISSUER_ID'],
      hasKeyId: !!process.env['APP_STORE_KEY_ID'],
      hasPrivateKey: !!process.env['APP_STORE_PRIVATE_KEY'],
      storeIntegrationEnabled: process.env['ENABLE_STORE_INTEGRATION'] === 'true',
      appstoreEnabled: process.env['APPSTORE_INTEGRATION_ENABLED'] === 'true',
      bundleIds: process.env['APP_STORE_BUNDLE_IDS']?.split(',').filter(id => id.trim()) || [],
      
      // 检查私钥格式（不暴露实际内容）
      privateKeyFormat: process.env['APP_STORE_PRIVATE_KEY'] ? {
        hasBeginMarker: process.env['APP_STORE_PRIVATE_KEY'].includes('-----BEGIN'),
        hasEndMarker: process.env['APP_STORE_PRIVATE_KEY'].includes('-----END'),
        estimatedLength: process.env['APP_STORE_PRIVATE_KEY'].length,
        hasNewlines: process.env['APP_STORE_PRIVATE_KEY'].includes('\n')
      } : null
    };

    // 2. 测试JWT生成
    if (results.diagnostics.environment.hasIssuerId && 
        results.diagnostics.environment.hasKeyId && 
        results.diagnostics.environment.hasPrivateKey) {
      
      try {
        const now = Math.floor(Date.now() / 1000);
        const payload = {
          iss: process.env['APP_STORE_ISSUER_ID'],
          iat: now,
          exp: now + (20 * 60), // 20分钟
          aud: 'appstoreconnect-v1',
        };

        const token = jwt.sign(payload, process.env['APP_STORE_PRIVATE_KEY']!, {
          algorithm: 'ES256',
          keyid: process.env['APP_STORE_KEY_ID']!,
        });

        results.diagnostics.jwtGeneration = {
          success: true,
          tokenLength: token.length,
          payload: {
            iss: payload.iss,
            iat: new Date(payload.iat * 1000).toISOString(),
            exp: new Date(payload.exp * 1000).toISOString(),
            aud: payload.aud
          }
        };

        // 3. 测试API连接
        const httpClient = axios.create({
          baseURL: 'https://api.appstoreconnect.apple.com/v1',
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });

        try {
          // 测试最基本的API调用
          const response = await httpClient.get('/apps', {
            params: { limit: 1 }
          });

          results.diagnostics.apiConnection = {
            success: true,
            statusCode: response.status,
            responseHeaders: {
              'content-type': response.headers['content-type'],
              'x-rate-limit-remaining': response.headers['x-rate-limit-remaining']
            },
            dataReceived: !!response.data?.data
          };

          // 4. 测试customerReviews端点
          try {
            const reviewsResponse = await httpClient.get('/customerReviews', {
              params: { 
                limit: 1,
                'filter[territory]': 'CHN'
              }
            });

            results.diagnostics.apiPermissions.customerReviews = {
              success: true,
              statusCode: reviewsResponse.status,
              dataCount: reviewsResponse.data?.data?.length || 0
            };

          } catch (reviewsError) {
            const errorDetails = getErrorDetails(reviewsError);
            results.diagnostics.apiPermissions.customerReviews = {
              success: false,
              error: errorDetails.message,
              statusCode: (reviewsError as any)?.response?.status,
              responseData: (reviewsError as any)?.response?.data
            };
          }

          // 5. 测试customerReviewResponses端点
          try {
            const responsesResponse = await httpClient.get('/customerReviewResponses', {
              params: { limit: 1 }
            });

            results.diagnostics.apiPermissions.customerReviewResponses = {
              success: true,
              statusCode: responsesResponse.status,
              dataCount: responsesResponse.data?.data?.length || 0
            };

          } catch (responsesError) {
            const errorDetails = getErrorDetails(responsesError);
            results.diagnostics.apiPermissions.customerReviewResponses = {
              success: false,
              error: errorDetails.message,
              statusCode: (responsesError as any)?.response?.status,
              responseData: (responsesError as any)?.response?.data
            };
          }

        } catch (apiError) {
          const errorDetails = getErrorDetails(apiError);
          results.diagnostics.apiConnection = {
            success: false,
            error: errorDetails.message,
            statusCode: (apiError as any)?.response?.status,
            responseData: (apiError as any)?.response?.data
          };
        }

      } catch (jwtError) {
        const errorDetails = getErrorDetails(jwtError);
        results.diagnostics.jwtGeneration = {
          success: false,
          error: errorDetails.message,
          details: errorDetails.details
        };
      }
    } else {
      results.diagnostics.jwtGeneration = {
        success: false,
        error: '缺少必需的环境变量'
      };
    }

    return res.json(results);

  } catch (error) {
    logger.error('App Store详细诊断失败', { error });
    const errorDetails = getErrorDetails(error);
    
    return res.status(500).json({
      success: false,
      error: errorDetails.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
