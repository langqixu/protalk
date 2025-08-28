import axios, { AxiosInstance } from 'axios';
import { createClient } from '@supabase/supabase-js';
import logger from '../../utils/logger';

interface FeishuBotV2Config {
  appId: string;
  appSecret: string;
  verificationToken: string;
  encryptKey?: string;
  supabaseUrl: string;
  supabaseKey: string;
}

/**
 * 升级版飞书机器人 - 支持多种API版本的混合使用
 * 解决v1 API兼容性问题，同时保持最新功能支持
 */
export class FeishuBotV2 {
  private httpClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private config: FeishuBotV2Config) {
    this.httpClient = axios.create({
      baseURL: 'https://open.feishu.cn/open-apis',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });

    // Initialize Supabase client if needed
    createClient(config.supabaseUrl, config.supabaseKey);
    
    logger.info('飞书机器人V2初始化成功 - 支持混合API版本');
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
      this.tokenExpiresAt = Date.now() + (response.data.expire * 1000) - 60000;

      return this.accessToken!;
    } catch (error) {
      logger.error('获取飞书访问令牌失败', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * 发送文本消息 - 优先使用v1，fallback到v4
   */
  async sendMessage(chatId: string, content: string): Promise<void> {
    const token = await this.getAccessToken();
    
    // 尝试v1 API
    const v1Success = await this.tryV1TextMessage(token, chatId, content);
    if (v1Success) {
      logger.info('v1 API文本消息发送成功', { chatId });
      return;
    }
    
    // fallback到v4 API
    logger.info('v1 API失败，使用v4 API发送文本消息', { chatId });
    await this.sendV4TextMessage(token, chatId, content);
  }

  /**
   * 发送卡片消息 - 优先使用v1，fallback到v4
   */
  async sendCardMessage(chatId: string, cardData: any): Promise<void> {
    const token = await this.getAccessToken();
    
    // 尝试v1 API
    const v1Success = await this.tryV1CardMessage(token, chatId, cardData);
    if (v1Success) {
      logger.info('v1 API卡片消息发送成功', { chatId });
      return;
    }
    
    // fallback到v4 API
    logger.info('v1 API失败，使用v4 API发送卡片消息', { chatId });
    await this.sendV4CardMessage(token, chatId, cardData);
  }

  /**
   * 尝试v1 API发送文本消息
   */
  private async tryV1TextMessage(token: string, chatId: string, content: string): Promise<boolean> {
    try {
      await this.httpClient.post('/im/v1/messages', {
        receive_id: chatId,
        receive_id_type: 'chat_id',
        msg_type: 'text',
        content: JSON.stringify({ text: content })
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return true;
    } catch (error) {
      logger.debug('v1 API文本消息失败', { 
        error: (error as any)?.response?.data?.msg || (error as Error).message 
      });
      return false;
    }
  }

  /**
   * 尝试v1 API发送卡片消息
   */
  private async tryV1CardMessage(token: string, chatId: string, cardData: any): Promise<boolean> {
    try {
      await this.httpClient.post('/im/v1/messages', {
        receive_id: chatId,
        receive_id_type: 'chat_id',
        msg_type: 'interactive',
        content: JSON.stringify(cardData)
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return true;
    } catch (error) {
      logger.debug('v1 API卡片消息失败', { 
        error: (error as any)?.response?.data?.msg || (error as Error).message 
      });
      return false;
    }
  }

  /**
   * v4 API发送文本消息
   */
  private async sendV4TextMessage(token: string, chatId: string, content: string): Promise<void> {
    try {
      const response = await this.httpClient.post('/message/v4/send/', {
        chat_id: chatId,
        msg_type: 'text',
        content: { text: content }
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      logger.info('v4 API文本消息发送成功', { chatId, responseData: response.data });
    } catch (error) {
      logger.error('v4 API文本消息发送失败', { 
        chatId, 
        error: (error as any)?.response?.data || (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * v4 API发送卡片消息
   */
  private async sendV4CardMessage(token: string, chatId: string, cardData: any): Promise<void> {
    try {
      const response = await this.httpClient.post('/message/v4/send/', {
        chat_id: chatId,
        msg_type: 'interactive',
        content: cardData
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      logger.info('v4 API卡片消息发送成功', { chatId, responseData: response.data });
    } catch (error) {
      logger.error('v4 API卡片消息发送失败', { 
        chatId, 
        error: (error as any)?.response?.data || (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * 发送富文本消息（仅v1支持）
   */
  async sendRichTextMessage(chatId: string, postContent: any): Promise<void> {
    const token = await this.getAccessToken();
    
    try {
      await this.httpClient.post('/im/v1/messages', {
        receive_id: chatId,
        receive_id_type: 'chat_id',
        msg_type: 'post',
        content: JSON.stringify({ post: postContent })
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      logger.info('富文本消息发送成功', { chatId });
    } catch (error) {
      logger.error('富文本消息发送失败，可能需要检查应用权限', { 
        chatId, 
        error: (error as any)?.response?.data || (error as Error).message 
      });
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
        headers: { 'Authorization': `Bearer ${token}` },
        params: { page_size: 100 }
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
        logger.info('获取到第一个群组ID', { chatId: firstChatId });
        return firstChatId || null;
      }
      logger.warn('没有找到可用的群组');
      return null;
    } catch (error) {
      logger.error('获取群组ID失败', { error: error instanceof Error ? error.message : error });
      return null;
    }
  }

  /**
   * 获取群组信息
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
      logger.error('获取群信息失败', { 
        chatId, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 获取群组成员列表
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
      logger.error('获取群成员失败', { 
        chatId, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }
}
