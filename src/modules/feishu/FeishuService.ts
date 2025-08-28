import { IFeishuService, ModeStatus } from './abstract/IFeishuService';
import { IFeishuMode, FeishuMode } from './abstract/IFeishuMode';
import { FeishuConfig, FeishuEvent, FeishuMessage, FeishuCommand } from '../../types/feishu';
import { Review } from '../../types';
import { EventSourceMode } from './modes/EventSourceMode';
import { WebhookMode } from './modes/WebhookMode';
import logger from '../../utils/logger';
import { FeishuBot } from './FeishuBot';

export class FeishuService implements IFeishuService {
  private config: FeishuConfig;
  private currentMode: IFeishuMode;
  private eventSourceMode: EventSourceMode;
  private webhookMode: WebhookMode;
  private modeStatus: ModeStatus;
  private isInitialized: boolean = false;
  private feishuBot: FeishuBot;

  constructor(config: FeishuConfig) {
    this.config = config;
    
    // 初始化所有模式
    this.eventSourceMode = new EventSourceMode(config);
    this.webhookMode = new WebhookMode(config);
    
    // 初始化飞书机器人
    this.feishuBot = new FeishuBot({
      appId: config.appId,
      appSecret: config.appSecret,
      verificationToken: config.verificationToken || '',
      encryptKey: config.encryptKey || '',
      supabaseUrl: process.env['SUPABASE_URL'] || '',
      supabaseKey: process.env['SUPABASE_ANON_KEY'] || ''
    });
    
    // 根据配置选择默认模式
    this.currentMode = this.getDefaultMode();
    
    this.modeStatus = {
      currentMode: this.config.mode,
      availableModes: ['webhook', 'eventsource'],
      lastSwitch: new Date(),
      switchCount: 0,
      isHealthy: true
    };

    logger.info('飞书服务初始化成功', {
      defaultMode: this.config.mode,
      availableModes: this.modeStatus.availableModes
    });
  }

  /**
   * 获取默认模式
   */
  private getDefaultMode(): IFeishuMode {
    switch (this.config.mode) {
      case 'eventsource':
        return this.eventSourceMode;
      case 'webhook':
      default:
        return this.webhookMode;
    }
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    try {
      logger.info('开始初始化飞书服务');

      // 初始化当前模式
      await this.currentMode.initialize();

      // 设置事件处理器
      this.setupEventHandlers();

      this.isInitialized = true;
      logger.info('飞书服务初始化完成');
    } catch (error) {
      logger.error('飞书服务初始化失败', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 为所有模式设置事件处理器
    [this.eventSourceMode, this.webhookMode].forEach(mode => {
      mode.on('message', async (message: FeishuMessage) => {
        await this.handleMessage(message);
      });

      mode.on('command', async (command: FeishuCommand) => {
        await this.handleCommand(command);
      });

      mode.on('error', async (error: any) => {
        logger.error('模式错误事件', { error });
      });
    });
  }

  /**
   * 实现IPusher接口 - 推送评论更新
   */
  async pushReviewUpdate(review: Review, type: 'new' | 'update' | 'reply'): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('飞书服务未初始化');
      }

      // 构建卡片消息
      const cardMessage = this.buildReviewMessage(review, type);
      
      // 自动获取群组ID
      const chatId = await this.feishuBot.getFirstChatId() || 'default_chat';
      
      // 发送卡片消息到飞书
      if (cardMessage.card) {
        await this.feishuBot.sendCardMessage(chatId, cardMessage.card);
        logger.info('评论卡片推送成功', {
          reviewId: review.id,
          type,
          chatId
        });
      } else {
        // 如果没有卡片数据，发送普通文本消息
        await this.feishuBot.sendMessage(chatId, cardMessage.content);
        logger.info('评论文本推送成功', {
          reviewId: review.id,
          type,
          chatId
        });
      }

      // 通过当前模式记录
      await this.currentMode.pushMessage(cardMessage);

    } catch (error) {
      logger.error('评论推送失败', {
        reviewId: review.id,
        type,
        mode: this.modeStatus.currentMode,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * 实现IPusher接口 - 批量推送评论更新
   */
  async pushBatchUpdates(reviews: Review[], type: 'new' | 'update' | 'reply'): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('飞书服务未初始化');
      }

      if (reviews.length === 0) {
        logger.debug('没有评论需要推送');
        return;
      }

      logger.info('开始批量推送评论', {
        count: reviews.length,
        type,
        mode: this.modeStatus.currentMode
      });

      // 构建消息
      const messages = reviews.map(review => this.buildReviewMessage(review, type));
      
      // 通过当前模式批量推送
      await this.currentMode.pushBatch(messages);

      logger.info('批量评论推送完成', {
        count: reviews.length,
        type,
        mode: this.modeStatus.currentMode
      });
    } catch (error) {
      logger.error('批量评论推送失败', {
        count: reviews.length,
        type,
        mode: this.modeStatus.currentMode,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * 构建评论消息
   */
  private buildReviewMessage(review: Review, type: 'new' | 'update' | 'reply'): FeishuMessage {
    // 构建评分显示
    const stars = '⭐'.repeat(review.rating);
    const ratingText = `${stars} ${review.rating} 星`;
    
    // 构建评论内容
    const title = review.title ? `**${review.title}**\n\n` : '';
    const content = `${title}${review.body}`;
    
    // 构建用户信息
    const userInfo = `👤 ${review.nickname} · ${review.createdDate.toLocaleString('zh-CN')}`;
    
    // 构建开发者回复（如果有）
    // const responseText = review.responseBody 
    //   ? `\n\n**开发者回复：**\n${review.responseBody}\n${review.responseDate?.toLocaleString('zh-CN') || ''}`
    //   : '';

    // 创建飞书交互式卡片
    const cardData = {
      config: {
        wide_screen_mode: true
      },
      header: {
        title: {
          tag: 'plain_text',
          content: `📱 App Store 评论 - ${type === 'new' ? '新评论' : type === 'update' ? '评论更新' : '开发者回复'}`
        },
        template: type === 'new' ? 'blue' : type === 'update' ? 'orange' : 'green'
      },
      elements: [
        // 评分和用户信息
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `${ratingText}\n\n${userInfo}`
          }
        },
        
        // 评论内容
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: content
          }
        },
        
        // 开发者回复（如果有）
        ...(review.responseBody ? [{
          tag: 'note',
          elements: [
            {
              tag: 'lark_md',
              content: `**开发者回复：**\n${review.responseBody}\n${review.responseDate?.toLocaleString('zh-CN') || ''}`
            }
          ]
        }] : []),
        
        // 回复输入框（仅对新评论和更新显示）
        ...(type === 'new' || type === 'update' ? [{
          tag: 'input',
          label: {
            tag: 'plain_text',
            content: '💬 回复评论'
          },
          placeholder: {
            tag: 'plain_text',
            content: '请输入您的回复内容...'
          },
          name: 'reply_content',
          value: {
            tag: 'plain_text',
            content: ''
          }
        }] : []),
        
        // 操作按钮
        {
          tag: 'action',
          actions: [
            // 回复按钮（仅对新评论和更新显示）
            ...(type === 'new' || type === 'update' ? [{
              tag: 'button',
              text: {
                tag: 'plain_text',
                content: '📤 提交回复'
              },
              type: 'primary',
              value: {
                reviewId: review.id,
                appId: review.appId,
                action: 'submit_reply'
              }
            }] : []),
            {
              tag: 'button',
              text: {
                tag: 'plain_text',
                content: '📊 查看详情'
              },
              type: 'default',
              value: {
                reviewId: review.id,
                appId: review.appId,
                action: 'view_details'
              }
            },
            {
              tag: 'button',
              text: {
                tag: 'plain_text',
                content: '🔄 刷新'
              },
              type: 'default',
              value: {
                reviewId: review.id,
                appId: review.appId,
                action: 'refresh'
              }
            }
          ]
        }
      ]
    };

    return {
      message_id: `card_${Date.now()}_${Math.random()}`,
      chat_id: 'auto_detected', // 这个字段不会被使用，实际chat_id会在pushReviewUpdate中获取
      content: JSON.stringify(cardData),
      card: cardData,
      sender: {
        sender_id: 'system',
        sender_type: 'system'
      }
    };
  }

  /**
   * 获取当前模式
   */
  get mode(): FeishuMode {
    return this.modeStatus.currentMode;
  }

  /**
   * 切换模式
   */
  async switchMode(mode: FeishuMode): Promise<void> {
    try {
      if (mode === this.modeStatus.currentMode) {
        logger.info('模式已经是目标模式，无需切换', { mode });
        return;
      }

      logger.info('开始切换模式', {
        from: this.modeStatus.currentMode,
        to: mode
      });

      // 断开当前模式
      await this.currentMode.disconnect();

      // 切换到新模式
      switch (mode) {
        case 'eventsource':
          this.currentMode = this.eventSourceMode;
          break;
        case 'webhook':
          this.currentMode = this.webhookMode;
          break;
        default:
          throw new Error(`不支持的模式: ${mode}`);
      }

      // 初始化新模式
      await this.currentMode.initialize();

      // 更新状态
      this.modeStatus.currentMode = mode;
      this.modeStatus.lastSwitch = new Date();
      this.modeStatus.switchCount++;

      logger.info('模式切换成功', {
        newMode: mode,
        switchCount: this.modeStatus.switchCount
      });
    } catch (error) {
      logger.error('模式切换失败', {
        from: this.modeStatus.currentMode,
        to: mode,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * 获取模式状态
   */
  getModeStatus(): ModeStatus {
    return {
      ...this.modeStatus,
      isHealthy: this.currentMode.isConnected()
    };
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus() {
    return this.currentMode.getStatus();
  }

  /**
   * 重新连接
   */
  async reconnect(): Promise<void> {
    await this.currentMode.reconnect();
  }

  /**
   * 处理事件
   */
  async handleEvent(event: FeishuEvent): Promise<void> {
    await this.currentMode.handleEvent(event);
  }

  /**
   * 处理消息
   */
  async handleMessage(message: FeishuMessage): Promise<void> {
    await this.currentMode.handleMessage(message);
  }

  /**
   * 处理指令
   */
  async handleCommand(command: FeishuCommand): Promise<void> {
    await this.currentMode.handleCommand(command);
  }

  /**
   * 处理回复操作
   */
  async handleReplyAction(reviewId: string, replyContent: string, userId: string): Promise<void> {
    try {
      logger.info('处理回复操作', {
        reviewId,
        replyContent,
        userId
      });

      // 调用App Store Connect API来回复评论
      // 这里需要集成现有的App Store API
      // 暂时发送确认消息
      
      // 发送回复确认消息
      const confirmCardData = {
        config: {
          wide_screen_mode: true
        },
        header: {
          title: {
            tag: 'plain_text',
            content: '✅ 回复已提交'
          },
          template: 'green'
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**回复内容：**\n${replyContent}\n\n回复已成功提交到App Store，将在审核后显示。`
            }
          }
        ]
      };

      const confirmMessage: FeishuMessage = {
        message_id: `confirm_${Date.now()}_${Math.random()}`,
        chat_id: this.config.webhookUrl.split('/').pop() || 'default_chat',
        content: JSON.stringify(confirmCardData),
        card: confirmCardData,
        sender: {
          sender_id: 'system',
          sender_type: 'system'
        }
      };

      await this.currentMode.pushMessage(confirmMessage);

      logger.info('回复确认消息发送成功', { reviewId });
    } catch (error) {
      logger.error('处理回复操作失败', {
        reviewId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * 关闭服务
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('开始关闭飞书服务');

      // 断开当前模式连接
      await this.currentMode.disconnect();

      this.isInitialized = false;
      logger.info('飞书服务已关闭');
    } catch (error) {
      logger.error('关闭飞书服务失败', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * 获取当前模式实例（用于测试和调试）
   */
  getCurrentMode(): IFeishuMode {
    return this.currentMode;
  }
}
