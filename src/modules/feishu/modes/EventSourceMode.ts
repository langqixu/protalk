import { IFeishuMode, ConnectionStatus } from '../abstract/IFeishuMode';
import { FeishuConfig, FeishuEvent, FeishuMessage, FeishuCommand, MessageTask } from '../../../types/feishu';
import { EventSourceClient } from '../client/EventSourceClient';
import { MessageQueue } from '../queue/MessageQueue';
import logger from '../../../utils/logger';

export class EventSourceMode implements IFeishuMode {
  private client: EventSourceClient;
  private messageQueue: MessageQueue;
  private status: ConnectionStatus;
  private eventHandlers: Map<string, Function> = new Map();

  constructor(config: FeishuConfig) {
    this.client = new EventSourceClient(config);
    this.status = {
      mode: 'eventsource',
      connected: false,
      lastHeartbeat: new Date(),
      errorCount: 0,
      messageCount: 0
    };

    // 初始化消息队列
    this.messageQueue = new MessageQueue(
      async (tasks: MessageTask[]) => {
        await this.processMessageBatch(tasks);
      },
      {
        batchSize: config.batchSize || 10,
        interval: config.processInterval || 2000,
        maxRetries: config.retryAttempts || 3
      }
    );

    logger.info('EventSource模式初始化成功');
  }

  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    try {
      logger.info('开始初始化EventSource模式');

      // 设置事件处理器
      this.setupEventHandlers();

      // 建立连接
      await this.connect();

      logger.info('EventSource模式初始化完成');
    } catch (error) {
      logger.error('EventSource模式初始化失败', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 消息事件
    this.client.on('message', async (event: any) => {
      await this.handleMessage(event);
    });

    // 错误事件
    this.client.on('error', async (error: any) => {
      await this.handleError(error);
    });

    // 连接关闭事件
    this.client.on('close', async () => {
      await this.handleClose();
    });

    // 连接打开事件
    this.client.on('open', async () => {
      await this.handleOpen();
    });
  }

  /**
   * 推送消息
   */
  async pushMessage(message: FeishuMessage): Promise<void> {
    try {
      const task: MessageTask = {
        id: `task_${Date.now()}_${Math.random()}`,
        message,
        type: 'notification',
        timestamp: Date.now(),
        retryCount: 0
      };

      await this.messageQueue.enqueue(task);
      this.status.messageCount++;

      logger.debug('消息已加入推送队列', {
        messageId: message.message_id,
        queueSize: this.messageQueue.getSize()
      });
    } catch (error) {
      logger.error('推送消息失败', {
        messageId: message.message_id,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * 批量推送消息
   */
  async pushBatch(messages: FeishuMessage[]): Promise<void> {
    try {
      const tasks: MessageTask[] = messages.map((message, index) => ({
        id: `batch_${Date.now()}_${index}`,
        message,
        type: 'notification',
        timestamp: Date.now(),
        retryCount: 0
      }));

      await this.messageQueue.enqueueBatch(tasks);
      this.status.messageCount += messages.length;

      logger.debug('批量消息已加入推送队列', {
        count: messages.length,
        queueSize: this.messageQueue.getSize()
      });
    } catch (error) {
      logger.error('批量推送消息失败', {
        count: messages.length,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * 处理消息批次
   */
  private async processMessageBatch(tasks: MessageTask[]): Promise<void> {
    try {
      for (const task of tasks) {
        await this.client.sendMessage(task.message);
      }

      logger.debug('消息批次处理完成', {
        batchSize: tasks.length
      });
    } catch (error) {
      logger.error('处理消息批次失败', {
        batchSize: tasks.length,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * 处理事件
   */
  async handleEvent(event: FeishuEvent): Promise<void> {
    try {
      const handler = this.eventHandlers.get('event');
      if (handler) {
        await handler(event);
      }

      logger.debug('事件处理完成', {
        eventType: event.type
      });
    } catch (error) {
      logger.error('处理事件失败', {
        eventType: event.type,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * 处理消息
   */
  async handleMessage(message: FeishuMessage): Promise<void> {
    try {
      const handler = this.eventHandlers.get('message');
      if (handler) {
        await handler(message);
      }

      logger.debug('消息处理完成', {
        messageId: message.message_id
      });
    } catch (error) {
      logger.error('处理消息失败', {
        messageId: message.message_id,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * 处理指令
   */
  async handleCommand(command: FeishuCommand): Promise<void> {
    try {
      const handler = this.eventHandlers.get('command');
      if (handler) {
        await handler(command);
      }

      logger.debug('指令处理完成', {
        command: command.command
      });
    } catch (error) {
      logger.error('处理指令失败', {
        command: command.command,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * 注册事件处理器
   */
  on(event: string, handler: Function): void {
    this.eventHandlers.set(event, handler);
  }

  /**
   * 连接
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.status.connected = true;
      this.status.lastHeartbeat = new Date();

      logger.info('EventSource模式连接成功');
    } catch (error) {
      this.status.connected = false;
      this.status.errorCount++;

      logger.error('EventSource模式连接失败', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.close();
      this.status.connected = false;

      logger.info('EventSource模式连接已断开');
    } catch (error) {
      logger.error('断开EventSource模式连接失败', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * 重新连接
   */
  async reconnect(): Promise<void> {
    try {
      await this.disconnect();
      await this.connect();

      logger.info('EventSource模式重新连接成功');
    } catch (error) {
      logger.error('EventSource模式重新连接失败', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.client.isConnected();
  }

  /**
   * 获取连接状态
   */
  getStatus(): ConnectionStatus {
    return {
      ...this.status,
      connected: this.isConnected(),
      lastHeartbeat: this.status.lastHeartbeat
    };
  }

  /**
   * 处理连接打开事件
   */
  private async handleOpen(): Promise<void> {
    this.status.connected = true;
    this.status.lastHeartbeat = new Date();

    logger.info('EventSource连接已打开');
  }

  /**
   * 处理连接关闭事件
   */
  private async handleClose(): Promise<void> {
    this.status.connected = false;

    logger.warn('EventSource连接已关闭');
  }

  /**
   * 处理错误事件
   */
  private async handleError(error: any): Promise<void> {
    this.status.errorCount++;

    logger.error('EventSource连接错误', {
      error: error instanceof Error ? error.message : error,
      errorCount: this.status.errorCount
    });
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return this.messageQueue.getStatus();
  }
}
