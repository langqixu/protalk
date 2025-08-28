import { Client } from '@larksuiteoapi/node-sdk';
import { EventSource } from 'eventsource';
import { FeishuConfig, FeishuMessage } from '../../../types/feishu';
import logger from '../../../utils/logger';

export class EventSourceClient {
  private client: Client;
  private eventSource: EventSource | null = null;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 5000;
  private isConnecting: boolean = false;
  private eventHandlers: Map<string, Function> = new Map();
  private eventSourceUrl: string;

  constructor(config: FeishuConfig) {
    this.client = new Client({
      appId: config.appId,
      appSecret: config.appSecret
    });

    // 构建EventSource URL - 使用正确的飞书EventSource端点
    // 根据飞书官方文档，EventSource端点可能需要不同的格式
    this.eventSourceUrl = `https://open.feishu.cn/open-apis/events/v1/events`;

    logger.info('EventSource客户端初始化成功');
  }

  /**
   * 建立EventSource长连接
   */
  async connect(): Promise<void> {
    if (this.isConnecting) {
      logger.warn('连接已在进行中，跳过重复连接');
      return;
    }

    try {
      this.isConnecting = true;
      logger.info('开始建立EventSource长连接');

      // 构建EventSource URL - 使用app_id和app_secret进行认证
      const authUrl = `${this.eventSourceUrl}?app_id=${this.client.appId}&app_secret=${this.client.appSecret}`;
      
      // 创建EventSource连接
      this.eventSource = new EventSource(authUrl);

      // 设置事件监听器
      this.setupEventListeners();

      this.reconnectAttempts = 0;
      this.isConnecting = false;
      logger.info('EventSource长连接建立成功');
    } catch (error) {
      this.isConnecting = false;
      this.connected = false;
      logger.error('EventSource长连接建立失败', { 
        error: error instanceof Error ? error.message : error 
      });
      
      // 自动重连
      await this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.eventSource) {
      logger.error('EventSource未初始化，无法设置监听器');
      return;
    }

    // 连接打开事件
    this.eventSource.onopen = (event) => {
      this.connected = true;
      logger.info('EventSource连接已打开');
      this.triggerEvent('open', event);
    };

    // 消息事件
    this.eventSource.onmessage = (event) => {
      logger.debug('收到EventSource消息', { event });
      this.handleMessage(event);
    };

    // 错误事件
    this.eventSource.onerror = (event) => {
      this.connected = false;
      logger.error('EventSource连接错误', { event });
      this.triggerEvent('error', event);
      this.handleError(event);
    };

    // 连接关闭事件 - EventSource没有onclose事件，通过onerror检测
    // 当连接关闭时，会触发onerror事件
  }

  /**
   * 处理消息事件
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    try {
      const data = JSON.parse(event.data);
      logger.debug('解析EventSource消息', { data });

      const handler = this.eventHandlers.get('message');
      if (handler) {
        await handler(data);
      }
    } catch (error) {
      logger.error('处理EventSource消息失败', { 
        event, 
        error: error instanceof Error ? error.message : error 
      });
    }
  }

  /**
   * 处理错误事件
   */
  private async handleError(event: Event): Promise<void> {
    try {
      const handler = this.eventHandlers.get('error');
      if (handler) {
        await handler(event);
      }
    } catch (handlerError) {
      logger.error('处理EventSource错误失败', { 
        event, 
        handlerError: handlerError instanceof Error ? handlerError.message : handlerError 
      });
    }
  }

  /**
   * 处理连接关闭事件
   */
  private async handleClose(): Promise<void> {
    try {
      const handler = this.eventHandlers.get('close');
      if (handler) {
        await handler();
      }
    } catch (error) {
      logger.error('处理EventSource关闭事件失败', { 
        error: error instanceof Error ? error.message : error 
      });
    }

    // 自动重连
    await this.scheduleReconnect();
  }

  /**
   * 手动触发关闭事件（用于测试）
   */
  async triggerClose(): Promise<void> {
    await this.handleClose();
  }

  /**
   * 触发事件
   */
  private triggerEvent(eventName: string, data?: any): void {
    const handler = this.eventHandlers.get(eventName);
    if (handler) {
      try {
        handler(data);
      } catch (error) {
        logger.error('事件处理器执行失败', {
          eventName,
          error: error instanceof Error ? error.message : error
        });
      }
    }
  }

  /**
   * 注册事件处理器
   */
  on(event: string, handler: Function): void {
    this.eventHandlers.set(event, handler);
  }

  /**
   * 发送消息
   */
  async sendMessage(message: FeishuMessage): Promise<void> {
    try {
      // 使用SDK发送消息
      await this.client.im.message.create({
        data: {
          receive_id: message.chat_id,
          msg_type: 'text',
          content: JSON.stringify({ text: message.content })
        },
        params: {
          receive_id_type: 'chat_id'
        }
      });

      logger.info('消息发送成功', { messageId: message.message_id });
    } catch (error) {
      logger.error('消息发送失败', { 
        messageId: message.message_id,
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.connected = false;
      logger.info('EventSource连接已关闭');
    }
  }

  /**
   * 重新连接
   */
  async reconnect(): Promise<void> {
    logger.info('开始重新连接EventSource');
    await this.close();
    await this.connect();
  }

  /**
   * 安排重连
   */
  private async scheduleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('达到最大重连次数，停止重连', { 
        maxAttempts: this.maxReconnectAttempts 
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    logger.info('安排重连', { 
      attempt: this.reconnectAttempts, 
      delay 
    });

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logger.error('重连失败', { 
          attempt: this.reconnectAttempts,
          error: error instanceof Error ? error.message : error 
        });
      }
    }, delay);
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.connected && this.eventSource?.readyState === EventSource.OPEN;
  }

  /**
   * 获取连接状态
   */
  getStatus(): any {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      isConnecting: this.isConnecting,
      readyState: this.eventSource?.readyState
    };
  }
}
