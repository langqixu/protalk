/**
 * 统一的错误处理工具函数
 * 消除项目中重复的错误处理模式
 */

import logger from './logger';

/**
 * 标准化错误消息格式
 * 替代项目中频繁出现的 `error instanceof Error ? error.message : error` 模式
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object') {
    // 处理具有 message 属性的对象（如 Supabase 错误）
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    
    // 处理其他错误对象
    return JSON.stringify(error);
  }
  
  return '未知错误';
}

/**
 * 获取错误的详细信息，用于日志记录
 */
export function getErrorDetails(error: unknown): {
  message: string;
  code?: string | number;
  stack?: string;
  details?: any;
} {
  const message = getErrorMessage(error);
  
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      details: error
    };
  }
  
  if (error && typeof error === 'object') {
    const errorObj = error as any;
    return {
      message,
      code: errorObj.code || errorObj.status,
      details: errorObj.details || errorObj.data,
    };
  }
  
  return { message };
}

/**
 * 统一的错误日志记录
 * 标准化错误日志的格式和内容
 */
export function logError(context: string, error: unknown, metadata?: Record<string, any>): void {
  const errorDetails = getErrorDetails(error);
  
  logger.error(context, {
    error: errorDetails.message,
    code: errorDetails.code,
    details: errorDetails.details,
    stack: errorDetails.stack,
    ...metadata
  });
}

/**
 * 异步操作的统一错误处理包装器
 * 简化 try-catch 模式的使用
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  context: string,
  metadata?: Record<string, any>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    logError(context, error, metadata);
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * 验证必需字段的工具函数
 */
export function validateRequiredFields<T extends Record<string, any>>(
  obj: T,
  requiredFields: (keyof T)[],
  context: string
): { isValid: true } | { isValid: false; missingFields: string[] } {
  const missingFields = requiredFields.filter(field => {
    const value = obj[field];
    return value === undefined || value === null || value === '';
  });
  
  if (missingFields.length > 0) {
    logError(`${context} - 验证失败`, new Error('缺少必需字段'), {
      missingFields: missingFields.map(String),
      providedFields: Object.keys(obj)
    });
    
    return {
      isValid: false,
      missingFields: missingFields.map(String)
    };
  }
  
  return { isValid: true };
}

/**
 * 创建标准化的API响应错误
 */
export function createApiError(
  message: string,
  code: string | number = 'INTERNAL_ERROR',
  statusCode: number = 500
): {
  success: false;
  error: string;
  code: string | number;
  statusCode: number;
} {
  return {
    success: false,
    error: message,
    code,
    statusCode
  };
}

/**
 * 重试机制的包装器
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts: number;
    delayMs: number;
    context: string;
    shouldRetry?: (error: unknown) => boolean;
  }
): Promise<T> {
  const { maxAttempts, delayMs, context, shouldRetry = () => true } = options;
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts || !shouldRetry(error)) {
        logError(`${context} - 最终失败`, error, { attempt, maxAttempts });
        throw error;
      }
      
      logger.warn(`${context} - 重试中`, {
        attempt,
        maxAttempts,
        error: getErrorMessage(error),
        nextRetryIn: delayMs
      });
      
      // 等待指定时间后重试
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw lastError;
}
