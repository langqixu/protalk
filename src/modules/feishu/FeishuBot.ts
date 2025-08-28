import axios, { AxiosInstance } from 'axios';
import { createClient } from '@supabase/supabase-js';
import logger from '../../utils/logger';

interface FeishuBotConfig {
  appId: string;
  appSecret: string;
  verificationToken: string;
  encryptKey?: string;
  supabaseUrl: string;
  supabaseKey: string;
}

interface SlashCommandEvent {
  command: string;
  text: string;
  user_id: string;
  chat_id: string;
  message_id: string;
  thread_id?: string;
}

interface CommentMapping {
  messageId: string;
  reviewId: string;
  appId: string;
  storeType: string;
  threadId?: string;
  createdAt: Date;
}

export class FeishuBot {
  private httpClient: AxiosInstance;
  private supabase: any;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private config: FeishuBotConfig) {
    this.httpClient = axios.create({
      baseURL: 'https://open.feishu.cn/open-apis',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    
    logger.info('飞书机器人初始化成功');
  }

  /**
   * 获取访问令牌
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const response = await this.httpClient.post('/auth/v3/tenant_access_token/internal', {
        app_id: this.config.appId,
        app_secret: this.config.appSecret,
      });

      this.accessToken = response.data.tenant_access_token;
      this.tokenExpiresAt = Date.now() + (response.data.expire * 1000) - 60000; // 提前1分钟过期

      return this.accessToken!;
    } catch (error) {
      logger.error('获取飞书访问令牌失败', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * 注册斜杠指令
   */
  async registerSlashCommands(): Promise<void> {
    try {
      const token = await this.getAccessToken();
      
      const commands = [
        {
          name: 'reply',
          description: '回复评论',
          usage: '/reply [回复内容]',
          example: '/reply 感谢您的反馈！'
        },
        {
          name: 'view',
          description: '查看评论详情',
          usage: '/view [评论ID]',
          example: '/view 00000040-3d92-5d03-09c6-be4800000000'
        },
        {
          name: 'help',
          description: '查看帮助信息',
          usage: '/help',
          example: '/help'
        }
      ];

      // 注册指令到飞书
      await this.httpClient.post('/im/v1/apps/slash_commands', {
        commands: commands
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      logger.info('斜杠指令注册成功');
    } catch (error) {
      logger.error('注册斜杠指令失败', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * 处理斜杠指令
   */
  async handleSlashCommand(event: SlashCommandEvent): Promise<void> {
    try {
      const { command, text, user_id, chat_id, message_id, thread_id } = event;
      
      logger.info('收到斜杠指令', { command, text, user_id, chat_id, message_id, thread_id });

      switch (command) {
        case '/reply':
          await this.handleReplyCommand(text, user_id, chat_id, message_id, thread_id);
          break;
        case '/view':
          await this.handleViewCommand(text, user_id, chat_id);
          break;
        case '/help':
          await this.handleHelpCommand(user_id, chat_id);
          break;
        default:
          await this.sendMessage(chat_id, '未知指令，请使用 /help 查看帮助信息');
      }
    } catch (error) {
      logger.error('处理斜杠指令失败', { 
        event, 
        error: error instanceof Error ? error.message : error 
      });
      await this.sendErrorMessage(event.chat_id, '处理指令时发生错误');
    }
  }

  /**
   * 处理回复指令
   */
  private async handleReplyCommand(text: string, userId: string, chatId: string, messageId: string, threadId?: string): Promise<void> {
    try {
      if (!text.trim()) {
        await this.sendMessage(chatId, '请提供回复内容，格式：/reply [回复内容]');
        return;
      }

      // 获取评论映射信息
      const mapping = await this.getCommentMapping(messageId, threadId);
      if (!mapping) {
        await this.sendMessage(chatId, '未找到相关评论，请确保在正确的评论话题中使用此指令');
        return;
      }

      // 调用回复API
      const result = await this.replyToReview(mapping.reviewId, text.trim(), mapping.storeType);
      
      if (result.success) {
        await this.sendMessage(chatId, `✅ 回复发送成功！\n\n**回复内容**: ${text.trim()}\n**回复时间**: ${new Date().toLocaleString('zh-CN')}`);
      } else {
        await this.sendErrorMessage(chatId, `回复失败: ${result.error}`);
      }
    } catch (error) {
      logger.error('处理回复指令失败', { 
        text, userId, chatId, messageId, threadId,
        error: error instanceof Error ? error.message : error 
      });
      await this.sendErrorMessage(chatId, '处理回复时发生错误');
    }
  }

  /**
   * 处理查看指令
   */
  private async handleViewCommand(text: string, userId: string, chatId: string): Promise<void> {
    try {
      const reviewId = text.trim();
      if (!reviewId) {
        await this.sendMessage(chatId, '请提供评论ID，格式：/view [评论ID]');
        return;
      }

      const review = await this.getReviewById(reviewId);
      if (!review) {
        await this.sendMessage(chatId, '未找到指定的评论');
        return;
      }

      const message = this.formatReviewMessage(review);
      await this.sendMessage(chatId, message);
    } catch (error) {
      logger.error('处理查看指令失败', { text, userId, chatId, error: error instanceof Error ? error.message : error });
      await this.sendErrorMessage(chatId, '查看评论时发生错误');
    }
  }

  /**
   * 处理帮助指令
   */
  private async handleHelpCommand(_userId: string, chatId: string): Promise<void> {
    const helpMessage = `
📖 **评论回复系统帮助**

**可用指令：**
• \`/reply [回复内容]\` - 回复当前话题的评论
• \`/view [评论ID]\` - 查看指定评论的详细信息
• \`/help\` - 显示此帮助信息

**使用说明：**
1. 在评论话题中使用 \`/reply\` 指令回复
2. 回复内容不能超过1000字符
3. 每个评论只能回复一次

**示例：**
\`/reply 感谢您的反馈！我们会继续改进。\`
\`/view 00000040-3d92-5d03-09c6-be4800000000\`

如有问题，请联系管理员。
    `;

    await this.sendMessage(chatId, helpMessage);
  }

  /**
   * 获取评论映射信息
   */
  private async getCommentMapping(messageId: string, threadId?: string): Promise<CommentMapping | null> {
    try {
      const { data, error } = await this.supabase
        .from('comment_mappings')
        .select('*')
        .eq('message_id', messageId)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      logger.error('获取评论映射失败', { messageId, threadId, error: error instanceof Error ? error.message : error });
      return null;
    }
  }

  /**
   * 根据ID获取评论
   */
  private async getReviewById(reviewId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('app_reviews')
        .select('*')
        .eq('review_id', reviewId)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      logger.error('获取评论失败', { reviewId, error: error instanceof Error ? error.message : error });
      return null;
    }
  }

  /**
   * 调用回复API
   */
  private async replyToReview(reviewId: string, responseBody: string, storeType: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 这里可以根据不同的商店类型调用不同的API
      const apiUrl = process.env['API_BASE_URL'] || 'http://localhost:3000';
      
      const response = await axios.post(`${apiUrl}/api/reply-review`, {
        review_id: reviewId,
        response_body: responseBody
      }, {
        headers: {
          'X-API-Key': process.env['API_KEY'] || 'your_api_key_for_http_endpoints'
        },
        timeout: 10000
      });

      return { success: response.data.success };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error('调用回复API失败', { reviewId, responseBody, storeType, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 格式化评论消息
   */
  private formatReviewMessage(review: any): string {
    const stars = '⭐'.repeat(review.rating);
    const reviewDate = new Date(review.review_date).toLocaleString('zh-CN');
    
    let message = `
📝 **评论详情**

**评论ID**: \`${review.review_id}\`
**用户**: ${review.nickname}
**评分**: ${stars} (${review.rating}星)
**时间**: ${reviewDate}
**标题**: ${review.title || '无标题'}
**内容**: ${review.body}

`;

    if (review.response_body) {
      const responseDate = new Date(review.response_date).toLocaleString('zh-CN');
      message += `**开发者回复**: ${review.response_body}\n**回复时间**: ${responseDate}`;
    } else {
      message += `**回复状态**: 未回复`;
    }

    return message;
  }

  /**
   * 发送消息
   */
  async sendMessage(chatId: string, content: string): Promise<void> {
    try {
      const token = await this.getAccessToken();
      
      const resp = await this.httpClient.post('/im/v1/messages', {
        receive_id: chatId,
        receive_id_type: 'chat_id',
        msg_type: 'text',
        content: JSON.stringify({ text: content })
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      logger.info('消息发送成功', { chatId, responseData: (resp as any)?.data });
    } catch (error) {
      logger.error('发送消息失败', { chatId, error: error instanceof Error ? error.message : error, errorResponse: (error as any)?.response?.data });
    }
  }

  /**
   * 发送错误消息
   */
  async sendErrorMessage(chatId: string, errorMessage: string): Promise<void> {
    const message = `❌ **错误**\n\n${errorMessage}`;
    await this.sendMessage(chatId, message);
  }

  /**
   * 发送卡片消息
   */
  async sendCardMessage(chatId: string, cardData: any): Promise<void> {
    try {
      const token = await this.getAccessToken();
      
      logger.info('准备发送卡片消息', { chatId, cardType: cardData.header?.title?.content });
      
      const response = await this.httpClient.post('/im/v1/messages', {
        receive_id: chatId,
        receive_id_type: 'chat_id',
        msg_type: 'interactive',
        content: JSON.stringify(cardData)
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      logger.info('卡片消息发送成功', { chatId, cardType: cardData.header?.title?.content, responseData: response.data });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : error;
      const errorResponse = (error as any)?.response?.data;
      
      logger.error('发送卡片消息失败', { 
        chatId, 
        error: errorMessage,
        errorResponse: errorResponse,
        cardData: JSON.stringify(cardData).substring(0, 200) + '...'
      });
      throw error;
    }
  }

  /**
   * 获取群信息
   */
  async getChatInfo(chatId: string): Promise<any> {
    const token = await this.getAccessToken();
    try {
      const resp = await this.httpClient.get(`/im/v1/chats/${chatId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      logger.info('获取群信息成功', { chatId });
      return resp.data;
    } catch (error) {
      logger.error('获取群信息失败', { chatId, error: error instanceof Error ? error.message : error, errorResponse: (error as any)?.response?.data });
      throw error;
    }
  }

  /**
   * 获取群成员列表
   */
  async getChatMembers(chatId: string, limit: number = 50): Promise<any> {
    const token = await this.getAccessToken();
    try {
      const resp = await this.httpClient.get(`/im/v1/chats/${chatId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { page_size: limit }
      });
      logger.info('获取群成员成功', { chatId, count: resp?.data?.data?.items?.length });
      return resp.data;
    } catch (error) {
      logger.error('获取群成员失败', { chatId, error: error instanceof Error ? error.message : error, errorResponse: (error as any)?.response?.data });
      throw error;
    }
  }
  /**
   * 获取群组列表
   */
  async getChatList(): Promise<string[]> {
    try {
      const token = await this.getAccessToken();
      
      const response = await this.httpClient.get('/im/v1/chats', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          page_size: 100
        }
      });

      const chatIds = response.data.data.items.map((chat: any) => chat.chat_id);
      
      logger.info('获取群组列表成功', { 
        totalCount: response.data.data.total,
        chatIds: chatIds
      });

      return chatIds;
    } catch (error) {
      logger.error('获取群组列表失败', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * 获取第一个可用的群组ID
   */
  async getFirstChatId(): Promise<string | null> {
    try {
      const chatIds = await this.getChatList();
      if (chatIds.length > 0) {
        const firstChatId = chatIds[0];
        if (firstChatId) {
          logger.info('获取到第一个群组ID', { chatId: firstChatId });
          return firstChatId;
        }
      }
      logger.warn('没有找到可用的群组');
      return null;
    } catch (error) {
      logger.error('获取群组ID失败', { error: error instanceof Error ? error.message : error });
      return null;
    }
  }

  /**
   * 存储评论映射
   */
  async storeCommentMapping(mapping: Omit<CommentMapping, 'createdAt'>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('comment_mappings')
        .insert({
          ...mapping,
          created_at: new Date().toISOString()
        });

      if (error) {
        logger.error('存储评论映射失败', { mapping, error });
      } else {
        logger.info('评论映射存储成功', { messageId: mapping.messageId, reviewId: mapping.reviewId });
      }
    } catch (error) {
      logger.error('存储评论映射失败', { mapping, error: error instanceof Error ? error.message : error });
    }
  }
}
