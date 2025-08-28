import { IFeishuMode, ConnectionStatus } from '../abstract/IFeishuMode';
import { FeishuConfig, FeishuEvent, FeishuMessage, FeishuCommand } from '../../../types/feishu';
import { Review } from '../../../types';
import logger from '../../../utils/logger';

export class WebhookMode implements IFeishuMode {
  private status: ConnectionStatus;
  private eventHandlers: Map<string, Function> = new Map();

  constructor(_config: FeishuConfig) {
    this.status = {
      mode: 'webhook',
      connected: true, // Webhook模式总是"连接"的
      lastHeartbeat: new Date(),
      errorCount: 0,
      messageCount: 0
    };

    logger.info('Webhook模式初始化成功');
  }

  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    logger.info('Webhook模式初始化完成');
  }

  /**
   * 推送消息（模拟，实际通过Webhook接收）
   */
  async pushMessage(message: FeishuMessage): Promise<void> {
    // Webhook模式下，消息推送通过HTTP请求处理
    // 这里只是记录，实际推送在Webhook路由中处理
    this.status.messageCount++;
    
    logger.debug('Webhook模式消息推送记录', {
      messageId: message.message_id,
      messageCount: this.status.messageCount
    });
  }

  /**
   * 批量推送消息
   */
  async pushBatch(messages: FeishuMessage[]): Promise<void> {
    for (const message of messages) {
      await this.pushMessage(message);
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

      logger.debug('Webhook模式事件处理完成', {
        eventType: event.type
      });
    } catch (error) {
      this.status.errorCount++;
      logger.error('Webhook模式事件处理失败', {
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

      logger.debug('Webhook模式消息处理完成', {
        messageId: message.message_id
      });
    } catch (error) {
      this.status.errorCount++;
      logger.error('Webhook模式消息处理失败', {
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

      logger.debug('Webhook模式指令处理完成', {
        command: command.command
      });
    } catch (error) {
      this.status.errorCount++;
      logger.error('Webhook模式指令处理失败', {
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
   * 连接（Webhook模式总是连接的）
   */
  async connect(): Promise<void> {
    this.status.connected = true;
    this.status.lastHeartbeat = new Date();
    logger.info('Webhook模式连接状态更新');
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    this.status.connected = false;
    logger.info('Webhook模式连接状态更新');
  }

  /**
   * 重新连接
   */
  async reconnect(): Promise<void> {
    await this.disconnect();
    await this.connect();
    logger.info('Webhook模式重新连接完成');
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.status.connected;
  }

  /**
   * 获取连接状态
   */
  getStatus(): ConnectionStatus {
    return {
      ...this.status,
      lastHeartbeat: new Date()
    };
  }

  /**
   * 构建评论消息（兼容现有FeishuPusher）
   */
  buildReviewMessage(review: Review, type: 'new' | 'update' | 'reply'): FeishuMessage {


    const stars = '⭐'.repeat(review.rating);
    const title = review.title ? `**${review.title}**\n` : '';
    const responseText = review.responseBody 
      ? `\n\n**开发者回复：**\n${review.responseBody}\n${review.responseDate?.toLocaleString('zh-CN') || ''}`
      : '';

    let content = `**${stars} ${review.rating} 星**\n\n${title}${review.body}\n\n👤 ${review.nickname} · ${review.createdDate.toLocaleString('zh-CN')}${responseText}`;
    
    // 为新评论和更新添加回复指令提示
    if (type === 'new' || type === 'update') {
      content += `\n\n💬 使用 \`/reply [回复内容]\` 来回复此评论`;
    }

    return {
      message_id: `webhook_${Date.now()}`,
      chat_id: 'webhook_chat',
      content,
      sender: {
        sender_id: 'system',
        sender_type: 'system'
      }
    };
  }
}
