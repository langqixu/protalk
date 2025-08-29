import logger from '../utils/logger';
import { IPusher } from '../types';
import { FeishuBotV1 } from '../modules/feishu/FeishuBotV1';
import { ReviewSyncService } from './ReviewSyncService';

interface FeishuServiceV1Config {
  appId: string;
  appSecret: string;
  verificationToken: string;
  encryptKey?: string | undefined;
  mode: 'eventsource' | 'webhook';
  supabaseUrl: string;
  supabaseKey: string;
  enableSignatureVerification?: boolean;
}

interface PusherMode {
  pushMessage(message: string): Promise<void>;
  getStatus(): { messageCount: number };
}

/**
 * EventSource模式 - 用于推送消息到飞书
 */
class EventSourceMode implements PusherMode {
  private messageCount = 0;

  async pushMessage(message: string): Promise<void> {
    // EventSource模式下，这个方法不直接发送消息
    // 消息发送由外部的feishuBot处理
    logger.debug('EventSource模式 - 消息推送记录', { message });
  }

  getStatus() {
    return { messageCount: this.messageCount };
  }

  incrementMessageCount() {
    this.messageCount++;
  }
}

/**
 * 基于v1 API的飞书服务
 * 提供与原FeishuService兼容的接口，但使用最新的v1 API实现
 */
export class FeishuServiceV1 implements IPusher {
  private feishuBot: FeishuBotV1;
  private currentMode: EventSourceMode;
  private reviewSyncService?: ReviewSyncService;

  constructor(private config: FeishuServiceV1Config) {
    this.feishuBot = new FeishuBotV1({
      appId: config.appId,
      appSecret: config.appSecret,
      verificationToken: config.verificationToken,
      encryptKey: config.encryptKey,
      supabaseUrl: config.supabaseUrl,
      supabaseKey: config.supabaseKey,
      enableSignatureVerification: config.enableSignatureVerification || false
    });

    this.currentMode = new EventSourceMode();
    
    logger.info('飞书服务V1初始化成功', { 
      mode: config.mode,
      enableSignatureVerification: config.enableSignatureVerification 
    });
  }

  /**
   * 推送消息到飞书 - 兼容原接口
   */
  async pushMessage(message: string): Promise<void> {
    try {
      const chatId = await this.feishuBot.getFirstChatId() || 'oc_130c7aece1e0c64c817d4bc764d1b686';
      
      await this.feishuBot.sendMessage(chatId, message);
      
      // 成功后更新计数
      this.currentMode.incrementMessageCount();
      
      logger.info('消息推送成功', { chatId, messageLength: message.length });
    } catch (error) {
      logger.error('消息推送失败', { 
        error: error instanceof Error ? error.message : error,
        messageLength: message.length 
      });
      throw error;
    }
  }

  /**
   * 推送评论到指定群组
   */
  async pushReviewToChat(chatId: string, review: any): Promise<void> {
    try {
      const cardData = this.feishuBot.createReviewCard(review);
      await this.feishuBot.sendCardMessage(chatId, cardData);
      
      this.currentMode.incrementMessageCount();
      
      logger.info('评论卡片推送成功', { chatId, reviewId: review.id });
    } catch (error) {
      logger.error('评论卡片推送失败', { 
        chatId, 
        reviewId: review.id,
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 发送文本消息到指定群组
   */
  async sendTextMessage(chatId: string, content: string): Promise<any> {
    try {
      const result = await this.feishuBot.sendMessage(chatId, content);
      this.currentMode.incrementMessageCount();
      return result;
    } catch (error) {
      logger.error('文本消息发送失败', { chatId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * 发送富文本消息到指定群组
   */
  async sendRichTextMessage(chatId: string, postContent: any): Promise<any> {
    try {
      const result = await this.feishuBot.sendRichTextMessage(chatId, postContent);
      this.currentMode.incrementMessageCount();
      return result;
    } catch (error) {
      logger.error('富文本消息发送失败', { chatId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * 发送卡片消息到指定群组
   */
  async sendCardMessage(chatId: string, cardData: any): Promise<any> {
    try {
      const result = await this.feishuBot.sendCardMessage(chatId, cardData);
      this.currentMode.incrementMessageCount();
      return result;
    } catch (error) {
      logger.error('卡片消息发送失败', { chatId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * 回复消息
   */
  async replyMessage(messageId: string, content: any, msgType?: 'text' | 'post' | 'interactive' | 'image'): Promise<any> {
    try {
      const result = await this.feishuBot.replyMessage(messageId, content, msgType);
      this.currentMode.incrementMessageCount();
      return result;
    } catch (error) {
      logger.error('消息回复失败', { messageId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * 获取群组列表
   */
  async getChatList(pageSize?: number, pageToken?: string): Promise<any> {
    try {
      return await this.feishuBot.getChatList(pageSize, pageToken);
    } catch (error) {
      logger.error('获取群组列表失败', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * 获取所有群组ID
   */
  async getAllChatIds(): Promise<string[]> {
    try {
      return await this.feishuBot.getAllChatIds();
    } catch (error) {
      logger.error('获取所有群组ID失败', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * 获取第一个群组ID
   */
  async getFirstChatId(): Promise<string | null> {
    try {
      return await this.feishuBot.getFirstChatId();
    } catch (error) {
      logger.error('获取第一个群组ID失败', { error: error instanceof Error ? error.message : error });
      return null;
    }
  }

  /**
   * 获取群组信息
   */
  async getChatInfo(chatId: string): Promise<any> {
    try {
      return await this.feishuBot.getChatInfo(chatId);
    } catch (error) {
      logger.error('获取群组信息失败', { chatId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * 获取群组成员
   */
  async getChatMembers(chatId: string, pageSize?: number, pageToken?: string): Promise<any> {
    try {
      return await this.feishuBot.getChatMembers(chatId, pageSize, pageToken);
    } catch (error) {
      logger.error('获取群组成员失败', { chatId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * 验证事件签名
   */
  verifyEventSignature(timestamp: string, nonce: string, body: string, signature: string): boolean {
    return this.feishuBot.verifyEventSignature(timestamp, nonce, body, signature);
  }

  /**
   * 获取状态信息 - 兼容原接口
   */
  getStatus() {
    return {
      mode: this.config.mode,
      messageCount: this.currentMode.getStatus().messageCount,
      apiVersion: 'v1',
      signatureVerification: this.config.enableSignatureVerification
    };
  }

  /**
   * 处理飞书事件 - webhook回调处理
   */
  async handleFeishuEvent(event: any): Promise<any> {
    try {
      logger.info('处理飞书事件', { 
        type: event.type, 
        eventId: event.event_id,
        token: event.token 
      });

      // 验证token
      if (event.token !== this.config.verificationToken) {
        logger.error('验证token失败', { 
          receivedToken: event.token,
          expectedToken: this.config.verificationToken 
        });
        throw new Error('Token验证失败');
      }

      // URL验证事件
      if (event.type === 'url_verification') {
        logger.info('处理URL验证事件', { challenge: event.challenge });
        return { challenge: event.challenge };
      }

      // 消息事件
      if (event.type === 'event_callback') {
        const eventData = event.event;
        
        if (eventData.type === 'message') {
          logger.info('收到消息事件', { 
            messageType: eventData.message.message_type,
            chatId: eventData.message.chat_id,
            senderId: eventData.sender.sender_id.user_id 
          });

          // 处理斜杠命令
          if (eventData.message.message_type === 'text') {
            const content = JSON.parse(eventData.message.content);
            if (content.text?.startsWith('/')) {
              await this.handleSlashCommand(eventData);
            }
          }
        }
      }

      return { code: 0, msg: 'success' };
    } catch (error) {
      logger.error('处理飞书事件失败', { 
        error: error instanceof Error ? error.message : error,
        event: JSON.stringify(event, null, 2)
      });
      throw error;
    }
  }

  /**
   * 处理斜杠命令
   */
  private async handleSlashCommand(eventData: any): Promise<void> {
    try {
      const content = JSON.parse(eventData.message.content);
      const command = content.text.trim();
      const chatId = eventData.message.chat_id;
      const userId = eventData.sender.sender_id.user_id;

      logger.info('处理斜杠命令', { command, chatId, userId });

      if (command === '/status') {
        const status = this.getStatus();
        const statusMessage = `🤖 **Protalk 机器人状态**\n\n` +
          `📊 **基本信息**\n` +
          `• API版本: ${status.apiVersion}\n` +
          `• 运行模式: ${status.mode}\n` +
          `• 消息计数: ${status.messageCount}\n` +
          `• 签名验证: ${status.signatureVerification ? '启用' : '禁用'}\n\n` +
          `⏰ **检查时间**: ${new Date().toLocaleString('zh-CN')}`;

        await this.sendTextMessage(chatId, statusMessage);
      } else if (command === '/help') {
        const helpMessage = `🤖 **Protalk 机器人帮助**\n\n` +
          `📋 **可用命令**:\n` +
          `• \`/status\` - 查看机器人状态\n` +
          `• \`/help\` - 显示此帮助信息\n` +
          `• \`/test\` - 发送测试消息\n\n` +
          `🔔 **功能说明**:\n` +
          `• App Store评论实时推送\n` +
          `• 支持富文本和互动卡片\n` +
          `• 基于飞书v1 API构建`;

        await this.sendTextMessage(chatId, helpMessage);
      } else if (command === '/test') {
        // 发送测试卡片
        const testCard = {
          config: { wide_screen_mode: true },
          header: {
            title: { tag: "plain_text", content: "🧪 测试消息" },
            template: "blue"
          },
          elements: [
            {
              tag: "div",
              text: {
                tag: "lark_md",
                content: `**测试时间**: ${new Date().toLocaleString('zh-CN')}\n**请求用户**: <at user_id="${userId}">用户</at>\n**状态**: ✅ 正常工作`
              }
            }
          ]
        };

        await this.sendCardMessage(chatId, testCard);
      }
    } catch (error) {
      logger.error('处理斜杠命令失败', { 
        error: error instanceof Error ? error.message : error 
      });
    }
  }

  /**
   * 推送评论更新 - 实现IPusher接口
   */
  async pushReviewUpdate(review: any, type: 'new' | 'update' | 'reply'): Promise<void> {
    try {
      // 🚨 紧急修复：检查是否为验证模式，如果不是验证且已推送则跳过
      if (!review.isVerification && review.isPushed) {
        logger.info('评论已推送，跳过重复推送', { 
          reviewId: review.id || review.reviewId, 
          type,
          isPushed: review.isPushed
        });
        return;
      }

      const chatId = await this.feishuBot.getFirstChatId() || 'oc_130c7aece1e0c64c817d4bc764d1b686';
      await this.pushReviewToChat(chatId, review);
      
      // 🚨 紧急修复：推送成功后更新数据库状态（仅对非验证评论）
      if (!review.isVerification) {
        try {
          const { SupabaseManager } = require('../modules/storage/SupabaseManager');
          const dbManager = new SupabaseManager();
          
          await dbManager.client
            .from('app_reviews')
            .update({ is_pushed: true, push_type: type })
            .eq('review_id', review.id || review.reviewId);
          
          logger.debug('评论推送状态更新成功', { reviewId: review.id || review.reviewId });
        } catch (dbError) {
          logger.error('更新推送状态失败', { 
            reviewId: review.id || review.reviewId,
            error: dbError instanceof Error ? dbError.message : dbError
          });
        }
      }
      
      logger.info('评论更新推送成功', { 
        reviewId: review.id || review.reviewId, 
        type,
        isVerification: !!review.isVerification
      });
    } catch (error) {
      logger.error('评论更新推送失败', { 
        reviewId: review.id || review.reviewId, 
        type,
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 批量推送评论更新 - 实现IPusher接口
   */
  async pushBatchUpdates(reviews: any[], type: 'new' | 'update' | 'reply'): Promise<void> {
    for (const review of reviews) {
      try {
        await this.pushReviewUpdate(review, type);
        // 避免发送过快
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        logger.error('批量推送单个评论失败', { 
          reviewId: review.id, 
          error: error instanceof Error ? error.message : error 
        });
      }
    }
    logger.info('批量评论推送完成', { count: reviews.length, type });
  }

  /**
   * 设置ReviewSyncService实例
   */
  setReviewSyncService(reviewSyncService: ReviewSyncService): void {
    this.reviewSyncService = reviewSyncService;
    logger.info('已设置ReviewSyncService实例');
  }

  /**
   * 处理回复操作 - 集成真实App Store Connect API
   */
  async handleReplyAction(reviewId: string, replyContent: string, userId: string): Promise<void> {
    try {
      logger.info('处理回复操作 - 使用真实API (V1)', {
        reviewId,
        replyContent: replyContent.substring(0, 50) + '...',
        userId
      });

      if (!this.reviewSyncService) {
        throw new Error('ReviewSyncService未初始化');
      }

      // 调用真实的App Store Connect API
      const result = await this.reviewSyncService.replyToReview(reviewId, replyContent);
      
      if (!result.success) {
        throw new Error(result.error || 'App Store API回复失败');
      }

      logger.info('App Store评论回复成功 (V1)', { 
        reviewId, 
        userId,
        responseDate: result.responseDate
      });
      
    } catch (error) {
      logger.error('App Store评论回复失败 (V1)', {
        reviewId,
        userId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * 发送确认消息 - 兼容原接口
   */
  async sendConfirmationMessage(): Promise<void> {
    try {
      const chatId = await this.feishuBot.getFirstChatId() || 'oc_130c7aece1e0c64c817d4bc764d1b686';
      
      const confirmationCard = {
        config: { wide_screen_mode: true },
        header: {
          title: { tag: "plain_text", content: "🚀 Protalk 服务启动" },
          template: "green"
        },
        elements: [
          {
            tag: "div",
            text: {
              tag: "lark_md",
              content: `**启动时间**: ${new Date().toLocaleString('zh-CN')}\n**API版本**: v1\n**服务状态**: ✅ 运行正常\n\n开始监控App Store评论...`
            }
          }
        ]
      };

      await this.feishuBot.sendCardMessage(chatId, confirmationCard);
      this.currentMode.incrementMessageCount();
      
      logger.info('服务启动确认消息发送成功', { chatId });
    } catch (error) {
      logger.error('发送确认消息失败', { 
        error: error instanceof Error ? error.message : error 
      });
      // 不抛出错误，避免影响服务启动
    }
  }

  /**
   * 创建评论卡片 - 公共方法
   */
  createReviewCard(review: any, cardState: string = 'initial'): any {
    return this.feishuBot.createReviewCard(review, cardState);
  }

  /**
   * 更新卡片消息 - 公共方法
   */
  async updateCardMessage(messageId: string, cardData: any): Promise<boolean> {
    return this.feishuBot.updateCardMessage(messageId, cardData);
  }

  /**
   * 打开模态对话框 - 公共方法
   */
  async openModal(triggerId: string, modalData: any): Promise<boolean> {
    return this.feishuBot.openModal(triggerId, modalData);
  }
}
