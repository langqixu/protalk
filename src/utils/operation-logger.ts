/**
 * 统一的操作日志记录工具
 * 标准化业务操作的日志记录模式
 */

import logger from './logger';
import { getErrorMessage } from './error-handler';

/**
 * 操作执行的结果类型
 */
interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
  metadata?: Record<string, any>;
}

/**
 * 操作日志记录器
 */
export class OperationLogger {
  private operationName: string;
  private startTime: number;
  private metadata: Record<string, any>;

  constructor(operationName: string, metadata: Record<string, any> = {}) {
    this.operationName = operationName;
    this.metadata = metadata;
    this.startTime = Date.now();
    
    logger.info(`开始${operationName}`, metadata);
  }

  /**
   * 记录操作成功
   */
  success<T>(data?: T, additionalMetadata?: Record<string, any>): OperationResult<T> {
    const duration = Date.now() - this.startTime;
    const result: OperationResult<T> = {
      success: true,
      data,
      duration,
      metadata: { ...this.metadata, ...additionalMetadata }
    };

    logger.info(`✅ ${this.operationName}成功`, {
      duration: `${duration}ms`,
      ...this.metadata,
      ...additionalMetadata
    });

    return result;
  }

  /**
   * 记录操作失败
   */
  failure(error: unknown, additionalMetadata?: Record<string, any>): OperationResult {
    const duration = Date.now() - this.startTime;
    const errorMessage = getErrorMessage(error);
    
    const result: OperationResult = {
      success: false,
      error: errorMessage,
      duration,
      metadata: { ...this.metadata, ...additionalMetadata }
    };

    logger.error(`❌ ${this.operationName}失败`, {
      error: errorMessage,
      duration: `${duration}ms`,
      ...this.metadata,
      ...additionalMetadata
    });

    return result;
  }

  /**
   * 记录操作进度
   */
  progress(step: string, data?: Record<string, any>): void {
    const duration = Date.now() - this.startTime;
    
    logger.debug(`🔄 ${this.operationName} - ${step}`, {
      step,
      duration: `${duration}ms`,
      ...this.metadata,
      ...data
    });
  }

  /**
   * 记录操作警告
   */
  warning(message: string, data?: Record<string, any>): void {
    const duration = Date.now() - this.startTime;
    
    logger.warn(`⚠️ ${this.operationName} - ${message}`, {
      warning: message,
      duration: `${duration}ms`,
      ...this.metadata,
      ...data
    });
  }
}

/**
 * 创建操作日志记录器的便捷函数
 */
export function createOperationLogger(operationName: string, metadata?: Record<string, any>): OperationLogger {
  return new OperationLogger(operationName, metadata);
}

/**
 * 同步操作的包装器，自动记录开始和结束
 */
export function loggedOperation<T>(
  operationName: string,
  operation: (logger: OperationLogger) => T,
  metadata?: Record<string, any>
): T {
  const opLogger = new OperationLogger(operationName, metadata);
  
  try {
    const result = operation(opLogger);
    opLogger.success(result);
    return result;
  } catch (error) {
    opLogger.failure(error);
    throw error;
  }
}

/**
 * 异步操作的包装器，自动记录开始和结束
 */
export async function loggedAsyncOperation<T>(
  operationName: string,
  operation: (logger: OperationLogger) => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const opLogger = new OperationLogger(operationName, metadata);
  
  try {
    const result = await operation(opLogger);
    opLogger.success(result);
    return result;
  } catch (error) {
    opLogger.failure(error);
    throw error;
  }
}

/**
 * 批处理操作的日志记录器
 */
export class BatchOperationLogger {
  private batchName: string;
  private startTime: number;
  private totalItems: number;
  private processedItems = 0;
  private successItems = 0;
  private failedItems = 0;
  private errors: string[] = [];

  constructor(batchName: string, totalItems: number, metadata?: Record<string, any>) {
    this.batchName = batchName;
    this.totalItems = totalItems;
    this.startTime = Date.now();
    
    logger.info(`开始批处理: ${batchName}`, {
      totalItems,
      ...metadata
    });
  }

  /**
   * 记录单个项目处理成功
   */
  itemSuccess(itemId: string, data?: Record<string, any>): void {
    this.processedItems++;
    this.successItems++;
    
    logger.debug(`✅ ${this.batchName} - 项目处理成功`, {
      itemId,
      progress: `${this.processedItems}/${this.totalItems}`,
      ...data
    });
  }

  /**
   * 记录单个项目处理失败
   */
  itemFailure(itemId: string, error: unknown, data?: Record<string, any>): void {
    this.processedItems++;
    this.failedItems++;
    const errorMessage = getErrorMessage(error);
    this.errors.push(`${itemId}: ${errorMessage}`);
    
    logger.warn(`❌ ${this.batchName} - 项目处理失败`, {
      itemId,
      error: errorMessage,
      progress: `${this.processedItems}/${this.totalItems}`,
      ...data
    });
  }

  /**
   * 完成批处理并记录汇总
   */
  complete(additionalMetadata?: Record<string, any>): {
    totalItems: number;
    successItems: number;
    failedItems: number;
    errors: string[];
    duration: number;
  } {
    const duration = Date.now() - this.startTime;
    const result = {
      totalItems: this.totalItems,
      successItems: this.successItems,
      failedItems: this.failedItems,
      errors: this.errors,
      duration
    };

    const logMessage = this.failedItems > 0 
      ? `⚠️ ${this.batchName}完成（有失败项目）`
      : `✅ ${this.batchName}完成`;

    logger.info(logMessage, {
      ...result,
      duration: `${duration}ms`,
      successRate: `${Math.round((this.successItems / this.totalItems) * 100)}%`,
      ...additionalMetadata
    });

    return result;
  }
}

/**
 * 创建批处理操作日志记录器的便捷函数
 */
export function createBatchLogger(batchName: string, totalItems: number, metadata?: Record<string, any>): BatchOperationLogger {
  return new BatchOperationLogger(batchName, totalItems, metadata);
}
