import { MessageTask, QueueStatus } from '../../../types/feishu';
import logger from '../../../utils/logger';

export class MessageQueue {
  private queue: MessageTask[] = [];
  private processing: boolean = false;
  private batchSize: number = 10;
  private interval: number = 2000; // 2秒间隔
  private maxRetries: number = 3;
  private status: QueueStatus = {
    size: 0,
    processing: false,
    lastProcessed: new Date(),
    errorCount: 0,
    successCount: 0
  };
  private processor: (tasks: MessageTask[]) => Promise<void>;

  constructor(
    processor: (tasks: MessageTask[]) => Promise<void>,
    options?: {
      batchSize?: number;
      interval?: number;
      maxRetries?: number;
    }
  ) {
    this.processor = processor;
    this.batchSize = options?.batchSize || 10;
    this.interval = options?.interval || 2000;
    this.maxRetries = options?.maxRetries || 3;

    logger.info('消息队列初始化成功', {
      batchSize: this.batchSize,
      interval: this.interval,
      maxRetries: this.maxRetries
    });
  }

  /**
   * 添加消息到队列
   */
  async enqueue(task: MessageTask): Promise<void> {
    this.queue.push(task);
    this.status.size = this.queue.length;
    
    logger.debug('消息已加入队列', {
      taskId: task.id,
      queueSize: this.queue.length
    });

    // 确保处理进程在运行
    this.ensureProcessing();
  }

  /**
   * 批量添加消息到队列
   */
  async enqueueBatch(tasks: MessageTask[]): Promise<void> {
    this.queue.push(...tasks);
    this.status.size = this.queue.length;
    
    logger.debug('批量消息已加入队列', {
      count: tasks.length,
      queueSize: this.queue.length
    });

    this.ensureProcessing();
  }

  /**
   * 确保处理进程在运行
   */
  private ensureProcessing(): void {
    if (!this.processing) {
      this.startProcessing();
    }
  }

  /**
   * 开始处理队列
   */
  private startProcessing(): void {
    if (this.processing) {
      return;
    }

    this.processing = true;
    this.status.processing = true;

    logger.info('开始处理消息队列');

    this.processLoop();
  }

  /**
   * 处理循环
   */
  private async processLoop(): Promise<void> {
    while (this.processing && this.queue.length > 0) {
      try {
        // 获取一批任务
        const batch = this.queue.splice(0, this.batchSize);
        this.status.size = this.queue.length;

        if (batch.length > 0) {
          logger.debug('处理消息批次', {
            batchSize: batch.length,
            remainingQueue: this.queue.length
          });

          // 处理批次
          await this.processBatch(batch);
          
          this.status.lastProcessed = new Date();
        }

        // 等待间隔
        if (this.queue.length > 0) {
          await this.sleep(this.interval);
        }
      } catch (error) {
        logger.error('处理消息队列时发生错误', {
          error: error instanceof Error ? error.message : error
        });
        
        this.status.errorCount++;
        
        // 等待一段时间后继续
        await this.sleep(this.interval * 2);
      }
    }

    this.processing = false;
    this.status.processing = false;
    logger.info('消息队列处理完成');
  }

  /**
   * 处理消息批次
   */
  private async processBatch(tasks: MessageTask[]): Promise<void> {
    try {
      logger.info('开始处理消息批次', { count: tasks.length });
      
      // 使用Promise.allSettled并发处理，提高效率并避免单个失败影响整体
      const promises = tasks.map(async (task) => {
        try {
          await this.processor([task]);
          this.status.successCount++;
          logger.debug('单个消息处理成功', { taskId: task.id });
        } catch (error) {
          logger.error('单个消息处理失败', { 
            taskId: task.id,
            error: error instanceof Error ? error.message : error 
          });
          throw error;
        }
      });
      
      const results = await Promise.allSettled(promises);
      
      // 统计成功和失败的数量
      const succeeded = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;
      
      logger.info('消息批次处理完成', { 
        total: tasks.length, 
        succeeded, 
        failed 
      });
      
      // 处理失败的任务
      if (failed > 0) {
        const failedTasks = tasks.filter((_, index) => results[index]?.status === 'rejected');
        await this.retryFailedTasks(failedTasks);
      }
    } catch (error) {
      logger.error('处理消息批次失败', {
        batchSize: tasks.length,
        error: error instanceof Error ? error.message : error
      });

      // 重试失败的任务
      await this.retryFailedTasks(tasks);
    }
  }

  /**
   * 重试失败的任务
   */
  private async retryFailedTasks(tasks: MessageTask[]): Promise<void> {
    const retryTasks: MessageTask[] = [];

    for (const task of tasks) {
      if (task.retryCount < this.maxRetries) {
        task.retryCount++;
        retryTasks.push(task);
        
        logger.debug('任务将重试', {
          taskId: task.id,
          retryCount: task.retryCount
        });
      } else {
        logger.warn('任务达到最大重试次数，放弃处理', {
          taskId: task.id,
          maxRetries: this.maxRetries
        });
        
        this.status.errorCount++;
      }
    }

    if (retryTasks.length > 0) {
      // 将重试任务重新加入队列
      this.queue.unshift(...retryTasks);
      this.status.size = this.queue.length;
      
      logger.info('重试任务已重新加入队列', {
        retryCount: retryTasks.length
      });
    }
  }

  /**
   * 停止处理
   */
  stop(): void {
    this.processing = false;
    this.status.processing = false;
    logger.info('消息队列处理已停止');
  }

  /**
   * 清空队列
   */
  clear(): void {
    const size = this.queue.length;
    this.queue = [];
    this.status.size = 0;
    
    logger.info('消息队列已清空', { clearedSize: size });
  }

  /**
   * 获取队列状态
   */
  getStatus(): QueueStatus {
    return {
      ...this.status,
      size: this.queue.length,
      processing: this.processing
    };
  }

  /**
   * 获取队列大小
   */
  getSize(): number {
    return this.queue.length;
  }

  /**
   * 检查是否正在处理
   */
  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * 等待指定时间
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
