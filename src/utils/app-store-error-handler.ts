/**
 * App Store Connect API错误处理工具
 * 提供详细的错误信息和用户友好的错误消息
 */

import logger from './logger';

export interface AppStoreError {
  code: string;
  detail: string;
  status: string;
  title: string;
  source?: {
    pointer?: string;
    parameter?: string;
  };
}

export interface AppStoreErrorResponse {
  errors: AppStoreError[];
}

export class AppStoreErrorHandler {
  /**
   * 处理App Store Connect API错误
   */
  static handleError(error: any): {
    userMessage: string;
    technicalMessage: string;
    errorCode: string;
    retryable: boolean;
  } {
    // 默认错误信息
    let userMessage = '提交回复时发生错误，请稍后重试';
    let technicalMessage = error.message || '未知错误';
    let errorCode = 'UNKNOWN_ERROR';
    let retryable = true;

    if (error.response?.data?.errors && error.response.data.errors.length > 0) {
      const apiErrors: AppStoreError[] = error.response.data.errors;
      const firstError = apiErrors[0];
      
      if (firstError) {
        errorCode = firstError.code;
        technicalMessage = firstError.detail;
        
        // 根据具体错误代码提供用户友好的消息
        switch (firstError.code) {
        case 'FORBIDDEN':
          userMessage = '没有权限回复此评论，请检查App Store Connect账户权限';
          retryable = false;
          break;
          
        case 'NOT_FOUND':
          userMessage = '找不到指定的评论，可能已被删除';
          retryable = false;
          break;
          
        case 'DUPLICATE_RESPONSE':
          userMessage = '此评论已有回复，无法重复回复';
          retryable = false;
          break;
          
        case 'INVALID_RESPONSE_BODY':
          userMessage = '回复内容不符合要求，请检查内容长度和格式';
          retryable = false;
          break;
          
        case 'RATE_LIMITED':
          userMessage = '请求过于频繁，请稍后重试';
          retryable = true;
          break;
          
        case 'UNAUTHORIZED':
          userMessage = 'App Store Connect认证已过期，请重新配置';
          retryable = true;
          break;
          
        case 'BAD_REQUEST':
          if (technicalMessage.includes('responseBody')) {
            userMessage = '回复内容格式错误，请检查内容';
          } else {
            userMessage = '请求参数错误，请检查回复内容';
          }
          retryable = false;
          break;
          
        case 'INTERNAL_SERVER_ERROR':
          userMessage = 'Apple服务器暂时不可用，请稍后重试';
          retryable = true;
          break;
          
        default:
          userMessage = `提交回复失败：${firstError.title || technicalMessage}`;
          retryable = true;
        }
        
        logger.error('App Store API错误详情', {
          errorCode: firstError.code,
          status: firstError.status,
          title: firstError.title,
          detail: firstError.detail,
          source: firstError.source
        });
      }
    } else if (error.response?.status) {
      // HTTP状态码错误
      const status = error.response.status;
      
      switch (status) {
        case 400:
          userMessage = '请求参数错误，请检查回复内容格式';
          errorCode = 'BAD_REQUEST';
          retryable = false;
          break;
          
        case 401:
          userMessage = 'App Store Connect认证失败，请检查配置';
          errorCode = 'UNAUTHORIZED';
          retryable = true;
          break;
          
        case 403:
          userMessage = '没有权限执行此操作，请检查账户权限';
          errorCode = 'FORBIDDEN';
          retryable = false;
          break;
          
        case 404:
          userMessage = '找不到指定的评论';
          errorCode = 'NOT_FOUND';
          retryable = false;
          break;
          
        case 409:
          userMessage = '此评论已有回复，无法重复回复';
          errorCode = 'CONFLICT';
          retryable = false;
          break;
          
        case 422:
          userMessage = '回复内容不符合要求，请检查内容';
          errorCode = 'UNPROCESSABLE_ENTITY';
          retryable = false;
          break;
          
        case 429:
          userMessage = '请求过于频繁，请稍后重试';
          errorCode = 'RATE_LIMITED';
          retryable = true;
          break;
          
        case 500:
        case 502:
        case 503:
        case 504:
          userMessage = 'Apple服务器暂时不可用，请稍后重试';
          errorCode = 'SERVER_ERROR';
          retryable = true;
          break;
          
        default:
          userMessage = `服务器返回错误 (${status})，请稍后重试`;
          errorCode = `HTTP_${status}`;
          retryable = true;
      }
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      userMessage = '网络连接失败，请检查网络设置';
      errorCode = 'NETWORK_ERROR';
      retryable = true;
    } else if (error.code === 'ETIMEDOUT') {
      userMessage = '请求超时，请稍后重试';
      errorCode = 'TIMEOUT';
      retryable = true;
    }

    return {
      userMessage,
      technicalMessage,
      errorCode,
      retryable
    };
  }

  /**
   * 检查错误是否可以重试
   */
  static isRetryable(error: any): boolean {
    const handled = this.handleError(error);
    return handled.retryable;
  }

  /**
   * 获取用户友好的错误消息
   */
  static getUserMessage(error: any): string {
    const handled = this.handleError(error);
    return handled.userMessage;
  }

  /**
   * 记录详细的错误信息
   */
  static logError(error: any, context: { reviewId: string; userId: string; replyContent: string }): void {
    const handled = this.handleError(error);
    
    logger.error('App Store回复API调用失败', {
      ...context,
      errorCode: handled.errorCode,
      userMessage: handled.userMessage,
      technicalMessage: handled.technicalMessage,
      retryable: handled.retryable,
      httpStatus: error.response?.status,
      requestUrl: error.config?.url,
      requestMethod: error.config?.method
    });
  }
}

export default AppStoreErrorHandler;
