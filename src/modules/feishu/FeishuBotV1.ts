import axios, { AxiosInstance } from 'axios';
import { createClient } from '@supabase/supabase-js';
import logger from '../../utils/logger';
import { FeishuSignature } from '../../utils/feishu-signature';

interface FeishuBotV1Config {
  appId: string;
  appSecret: string;
  verificationToken: string;
  encryptKey?: string | undefined;
  supabaseUrl: string;
  supabaseKey: string;
  enableSignatureVerification?: boolean;
}

interface TokenResponse {
  code: number;
  msg: string;
  tenant_access_token?: string;
  app_access_token?: string;
  expire?: number;
}

interface ChatListResponse {
  code: number;
  msg: string;
  data: {
    items: Array<{
      chat_id: string;
      name: string;
      description: string;
      chat_mode: string;
      chat_type: string;
      avatar?: string;
      external: boolean;
      tenant_key: string;
    }>;
    page_token: string;
    has_more: boolean;
  };
}

interface MessageResponse {
  code: number;
  msg: string;
  data: {
    message_id: string;
    root_id?: string;
    parent_id?: string;
    thread_id?: string;
    chat_id: string;
    sender: {
      id: string;
      id_type: string;
      sender_type: string;
      tenant_key: string;
    };
    create_time: string;
    update_time: string;
    deleted?: boolean;
    msg_type: string;
    content: string;
    mentions?: any[];
  };
}

/**
 * 飞书机器人V1 - 完全基于飞书v1 API的实现
 * 支持最新的消息发送、互动卡片、安全验证等功能
 */
export class FeishuBotV1 {
  private httpClient: AxiosInstance;
  private tenantAccessToken: string | null = null;
  private appAccessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private config: FeishuBotV1Config) {
    this.httpClient = axios.create({
      baseURL: 'https://open.feishu.cn/open-apis',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });

    // Initialize Supabase client if needed for future features
    createClient(config.supabaseUrl, config.supabaseKey);
    
    // 添加请求拦截器用于自动添加认证头
    this.httpClient.interceptors.request.use(async (config) => {
      const token = await this.getTenantAccessToken();
      config.headers['Authorization'] = `Bearer ${token}`;
      
      // 如果启用签名验证，添加签名头
      if (this.config.enableSignatureVerification && this.config.encryptKey) {
        const signatureHeaders = FeishuSignature.getSignatureHeaders(this.config.encryptKey);
        config.headers['X-Lark-Request-Timestamp'] = signatureHeaders.timestamp;
        config.headers['X-Lark-Signature'] = signatureHeaders.sign;
      }
      
      return config;
    });

    // 添加响应拦截器用于统一错误处理
    this.httpClient.interceptors.response.use(
      (response) => {
        const data = response.data;
        if (data.code !== 0) {
          logger.error('飞书API返回错误', { 
            code: data.code, 
            msg: data.msg,
            url: response.config.url 
          });
          throw new Error(`飞书API错误 [${data.code}]: ${data.msg}`);
        }
        return response;
      },
      (error) => {
        logger.error('飞书API请求失败', {
          url: error.config?.url,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
        throw error;
      }
    );
    
    logger.info('飞书机器人V1初始化成功 - 基于最新v1 API');
  }

  /**
   * 获取应用访问令牌 (App Access Token)
   * 暂时保留，可能用于某些特殊API调用
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getAppAccessToken(): Promise<string> {
    if (this.appAccessToken && Date.now() < this.tokenExpiresAt) {
      return this.appAccessToken;
    }

    try {
      logger.debug('获取飞书应用访问令牌');
      
      const response = await axios.post<TokenResponse>(
        'https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal/',
        {
          app_id: this.config.appId,
          app_secret: this.config.appSecret,
        },
        {
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          timeout: 10000
        }
      );

      if (response.data.code !== 0) {
        throw new Error(`获取应用令牌失败: ${response.data.msg}`);
      }

      this.appAccessToken = response.data.app_access_token!;
      this.tokenExpiresAt = Date.now() + (response.data.expire! * 1000) - 60000; // 提前1分钟过期

      logger.info('飞书应用访问令牌获取成功');
      return this.appAccessToken;
    } catch (error) {
      logger.error('获取飞书应用访问令牌失败', { 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 获取租户访问令牌 (Tenant Access Token)
   */
  private async getTenantAccessToken(): Promise<string> {
    if (this.tenantAccessToken && Date.now() < this.tokenExpiresAt) {
      return this.tenantAccessToken;
    }

    try {
      logger.debug('获取飞书租户访问令牌');
      
      const response = await axios.post<TokenResponse>(
        'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal/',
        {
          app_id: this.config.appId,
          app_secret: this.config.appSecret,
        },
        {
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          timeout: 10000
        }
      );

      if (response.data.code !== 0) {
        throw new Error(`获取租户令牌失败: ${response.data.msg}`);
      }

      this.tenantAccessToken = response.data.tenant_access_token!;
      this.tokenExpiresAt = Date.now() + (response.data.expire! * 1000) - 60000; // 提前1分钟过期

      logger.info('飞书租户访问令牌获取成功');
      return this.tenantAccessToken;
    } catch (error) {
      logger.error('获取飞书租户访问令牌失败', { 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 发送文本消息
   * @param chatId 群组ID
   * @param content 消息内容
   * @param receiveIdType 接收者ID类型，默认为chat_id
   */
  async sendMessage(
    chatId: string, 
    content: string, 
    receiveIdType: 'chat_id' | 'open_id' | 'user_id' | 'email' = 'chat_id'
  ): Promise<MessageResponse['data']> {
    try {
      logger.info('发送文本消息', { chatId, receiveIdType });
      
      const response = await this.httpClient.post<MessageResponse>(
        `/im/v1/messages?receive_id_type=${receiveIdType}`,
        {
          receive_id: chatId,
          msg_type: 'text',
          content: JSON.stringify({ text: content })
        }
      );

      logger.info('文本消息发送成功', { 
        chatId, 
        messageId: response.data.data.message_id 
      });
      
      return response.data.data;
    } catch (error) {
      logger.error('文本消息发送失败', { 
        chatId, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 发送富文本消息
   * @param chatId 群组ID
   * @param postContent 富文本内容
   * @param receiveIdType 接收者ID类型
   */
  async sendRichTextMessage(
    chatId: string, 
    postContent: any,
    receiveIdType: 'chat_id' | 'open_id' | 'user_id' | 'email' = 'chat_id'
  ): Promise<MessageResponse['data']> {
    try {
      logger.info('发送富文本消息', { chatId, receiveIdType });
      
      const response = await this.httpClient.post<MessageResponse>(
        `/im/v1/messages?receive_id_type=${receiveIdType}`,
        {
          receive_id: chatId,
          msg_type: 'post',
          content: JSON.stringify({ post: postContent })
        }
      );

      logger.info('富文本消息发送成功', { 
        chatId, 
        messageId: response.data.data.message_id 
      });
      
      return response.data.data;
    } catch (error) {
      logger.error('富文本消息发送失败', { 
        chatId, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 发送互动卡片消息
   * @param chatId 群组ID
   * @param cardData 卡片数据
   * @param receiveIdType 接收者ID类型
   */
  async sendCardMessage(
    chatId: string, 
    cardData: any,
    receiveIdType: 'chat_id' | 'open_id' | 'user_id' | 'email' = 'chat_id'
  ): Promise<MessageResponse['data']> {
    try {
      logger.info('发送互动卡片消息', { chatId, receiveIdType });
      
      const response = await this.httpClient.post<MessageResponse>(
        `/im/v1/messages?receive_id_type=${receiveIdType}`,
        {
          receive_id: chatId,
          msg_type: 'interactive',
          content: JSON.stringify(cardData)
        }
      );

      logger.info('互动卡片消息发送成功', { 
        chatId, 
        messageId: response.data.data.message_id 
      });
      
      return response.data.data;
    } catch (error) {
      logger.error('互动卡片消息发送失败', { 
        chatId, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 发送图片消息
   * @param chatId 群组ID
   * @param imageKey 图片key（需要先上传图片获得）
   * @param receiveIdType 接收者ID类型
   */
  async sendImageMessage(
    chatId: string, 
    imageKey: string,
    receiveIdType: 'chat_id' | 'open_id' | 'user_id' | 'email' = 'chat_id'
  ): Promise<MessageResponse['data']> {
    try {
      logger.info('发送图片消息', { chatId, receiveIdType, imageKey });
      
      const response = await this.httpClient.post<MessageResponse>(
        `/im/v1/messages?receive_id_type=${receiveIdType}`,
        {
          receive_id: chatId,
          msg_type: 'image',
          content: JSON.stringify({ image_key: imageKey })
        }
      );

      logger.info('图片消息发送成功', { 
        chatId, 
        messageId: response.data.data.message_id 
      });
      
      return response.data.data;
    } catch (error) {
      logger.error('图片消息发送失败', { 
        chatId, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 回复消息
   * @param originalMessageId 原消息ID
   * @param content 回复内容
   * @param msgType 消息类型
   */
  async replyMessage(
    originalMessageId: string,
    content: any,
    msgType: 'text' | 'post' | 'interactive' | 'image' = 'text'
  ): Promise<MessageResponse['data']> {
    try {
      logger.info('回复消息', { originalMessageId, msgType });
      
      const response = await this.httpClient.post<MessageResponse>(
        '/im/v1/messages/reply',
        {
          message_id: originalMessageId,
          msg_type: msgType,
          content: typeof content === 'string' ? content : JSON.stringify(content)
        }
      );

      logger.info('消息回复成功', { 
        originalMessageId, 
        replyMessageId: response.data.data.message_id 
      });
      
      return response.data.data;
    } catch (error) {
      logger.error('消息回复失败', { 
        originalMessageId, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 获取群组列表
   * @param pageSize 页面大小，默认20，最大100
   * @param pageToken 分页标记
   */
  async getChatList(pageSize: number = 50, pageToken?: string): Promise<ChatListResponse['data']> {
    try {
      logger.info('获取群组列表', { pageSize, pageToken });
      
      const params: any = { page_size: pageSize };
      if (pageToken) {
        params.page_token = pageToken;
      }

      const response = await this.httpClient.get<ChatListResponse>('/im/v1/chats', {
        params
      });

      logger.info('获取群组列表成功', { 
        totalCount: response.data.data.items.length,
        hasMore: response.data.data.has_more
      });

      return response.data.data;
    } catch (error) {
      logger.error('获取群组列表失败', { 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 获取所有群组ID
   */
  async getAllChatIds(): Promise<string[]> {
    const chatIds: string[] = [];
    let pageToken: string | undefined;
    
    do {
      const data = await this.getChatList(100, pageToken);
      chatIds.push(...data.items.map(chat => chat.chat_id));
      pageToken = data.has_more ? data.page_token : undefined;
    } while (pageToken);
    
    logger.info('获取所有群组ID完成', { totalCount: chatIds.length });
    return chatIds;
  }

  /**
   * 获取第一个可用的群组ID
   */
  async getFirstChatId(): Promise<string | null> {
    try {
      const data = await this.getChatList(1);
      if (data.items && data.items.length > 0) {
        const firstChatId = data.items[0]?.chat_id;
        if (firstChatId) {
          logger.info('获取到第一个群组ID', { chatId: firstChatId });
          return firstChatId;
        }
      }
      logger.warn('没有找到可用的群组');
      return null;
    } catch (error) {
      logger.error('获取群组ID失败', { 
        error: error instanceof Error ? error.message : error 
      });
      return null;
    }
  }

  /**
   * 获取群组信息
   * @param chatId 群组ID
   */
  async getChatInfo(chatId: string): Promise<any> {
    try {
      logger.info('获取群组信息', { chatId });
      
      const response = await this.httpClient.get(`/im/v1/chats/${chatId}`);
      
      logger.info('获取群组信息成功', { chatId });
      return response.data.data;
    } catch (error) {
      logger.error('获取群组信息失败', { 
        chatId, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 获取群组成员列表
   * @param chatId 群组ID
   * @param pageSize 页面大小
   * @param pageToken 分页标记
   * @param memberIdType 成员ID类型
   */
  async getChatMembers(
    chatId: string, 
    pageSize: number = 50,
    pageToken?: string,
    memberIdType: 'open_id' | 'user_id' | 'union_id' = 'open_id'
  ): Promise<any> {
    try {
      logger.info('获取群组成员', { chatId, pageSize, memberIdType });
      
      const params: any = { 
        page_size: pageSize,
        member_id_type: memberIdType
      };
      if (pageToken) {
        params.page_token = pageToken;
      }

      const response = await this.httpClient.get(`/im/v1/chats/${chatId}/members`, {
        params
      });
      
      logger.info('获取群组成员成功', { 
        chatId, 
        memberCount: response.data.data.items?.length || 0 
      });
      
      return response.data.data;
    } catch (error) {
      logger.error('获取群组成员失败', { 
        chatId, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 验证webhook事件签名
   * @param timestamp 时间戳
   * @param nonce 随机数
   * @param body 请求体
   * @param signature 签名
   */
  verifyEventSignature(timestamp: string, nonce: string, body: string, signature: string): boolean {
    if (!this.config.encryptKey) {
      logger.warn('未配置encryptKey，跳过签名验证');
      return true;
    }

    try {
      const stringToSign = `${timestamp}${nonce}${this.config.encryptKey!}${body}`;
      const expectedSignature = require('crypto')
        .createHash('sha1')
        .update(stringToSign, 'utf8')
        .digest('hex');

      const isValid = signature === expectedSignature;
      
      if (!isValid) {
        logger.error('事件签名验证失败', { 
          timestamp, 
          nonce, 
          receivedSignature: signature,
          expectedSignature 
        });
      }

      return isValid;
    } catch (error) {
      logger.error('签名验证过程出错', { error: error instanceof Error ? error.message : error });
      return false;
    }
  }

  /**
   * 创建App Store评论推送卡片（使用新的v2组件系统）
   */
  createReviewCard(review: any): any {
    try {
      // 导入新的评论卡片模板
      const { createReviewCard } = require('../../utils/review-card-templates');
      
      // 转换数据格式以匹配新的接口
      const reviewData = {
        id: review.id || `review_${Date.now()}`,
        app_name: review.app_name || '未知应用',
        app_id: review.app_id || '',
        title: review.title,
        content: review.content || '',
        rating: review.rating || 0,
        author: review.author,
        store_type: review.store_type || 'ios',
        version: review.version,
        date: review.date,
        country: review.country,
        verified_purchase: review.verified_purchase,
        helpful_count: review.helpful_count,
        developer_response: review.developer_response
      };

      return createReviewCard(reviewData);
    } catch (error) {
      logger.error('使用新卡片模板失败，降级到简单模板', { error: error instanceof Error ? error.message : error });
      
      // 降级到简单卡片
      const stars = '⭐'.repeat(Math.max(0, Math.min(5, review.rating || 0)));
      const storeIcon = review.store_type === 'ios' ? '📱' : '🤖';
      
      return {
        config: {
          wide_screen_mode: true,
          enable_forward: true
        },
        header: {
          title: {
            tag: "plain_text",
            content: `${storeIcon} ${review.app_name} - 新评论通知`
          },
          template: review.rating >= 4 ? "green" : review.rating >= 3 ? "yellow" : "red"
        },
        elements: [
          {
            tag: "div",
            text: {
              tag: "lark_md",
              content: `**评分**: ${stars} (${review.rating}/5)\n**用户**: ${review.author || '匿名'}\n**内容**: ${review.content || '无内容'}`
            }
          }
        ]
      };
    }
  }
}
