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

  // 注意：getAppAccessToken 方法已移除，因为当前实现只使用 tenant_access_token
  // 如果将来需要 app_access_token，可以参考 getTenantAccessToken 的实现

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
          content: JSON.stringify(cardData),
          update_multi: true  // 🔧 关键修复：允许群聊中的卡片交互
        }
      );

      // 检查飞书响应状态
      if (response.data.code !== 0) {
        const errorMsg = `飞书API返回错误: code=${response.data.code}, msg=${response.data.msg}`;
        logger.error('互动卡片消息发送失败', { 
          chatId, 
          code: response.data.code,
          msg: response.data.msg,
          error: errorMsg
        });
        throw new Error(errorMsg);
      }

      logger.info('互动卡片消息发送成功', { 
        chatId, 
        messageId: response.data.data?.message_id 
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
   * 更新已发送的互动卡片消息
   * @param messageId 消息ID
   * @param cardData 新的卡片数据
   */
  async updateCardMessage(messageId: string, cardData: any): Promise<boolean> {
    try {
      logger.info('更新互动卡片消息', { messageId });
      
      const response = await this.httpClient.patch<{ code: number; msg: string; data: any }>(
        `/im/v1/messages/${messageId}`,
        {
          content: JSON.stringify(cardData)
        }
      );

      // 检查飞书响应状态
      if (response.data.code !== 0) {
        const errorMsg = `飞书API更新卡片失败: code=${response.data.code}, msg=${response.data.msg}`;
        logger.error('互动卡片消息更新失败', { 
          messageId, 
          code: response.data.code,
          msg: response.data.msg,
          error: errorMsg
        });
        throw new Error(errorMsg);
      }

      logger.info('互动卡片消息更新成功', { messageId });
      return true;
    } catch (error) {
      logger.error('互动卡片消息更新失败', { 
        messageId, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 打开模态对话框
   * @param triggerId 触发器ID（来自按钮交互事件）
   * @param modalData 模态对话框数据
   */
  async openModal(triggerId: string, modalData: any): Promise<boolean> {
    try {
      logger.info('打开模态对话框', { triggerId });
      
      const response = await this.httpClient.post<{ code: number; msg: string; data: any }>(
        '/im/v1/modals/open',
        {
          trigger_id: triggerId,
          view: modalData
        }
      );

      // 检查飞书响应状态
      if (response.data.code !== 0) {
        const errorMsg = `飞书API打开模态对话框失败: code=${response.data.code}, msg=${response.data.msg}`;
        logger.error('模态对话框打开失败', { 
          triggerId, 
          code: response.data.code,
          msg: response.data.msg,
          error: errorMsg
        });
        throw new Error(errorMsg);
      }

      logger.info('模态对话框打开成功', { triggerId });
      return true;
    } catch (error) {
      logger.error('模态对话框打开失败', { 
        triggerId, 
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
   * 根据appId获取应用名称
   */
  private getAppNameById(appId: string): string {
    try {
      const { loadConfig } = require('../../config');
      const config = loadConfig();
      const store = config.stores?.find((s: any) => s.appId === appId);
      
      if (store?.name) {
        logger.debug('成功获取应用名称', { appId, appName: store.name });
        return store.name;
      }
      
      // Fallback：使用默认名称
      logger.warn('未找到应用名称，使用默认值', { appId });
      return '潮汐 for iOS'; // 硬编码的fallback，因为我们知道这个项目是为潮汐应用的
    } catch (error) {
      logger.error('获取应用名称失败', { appId, error: error instanceof Error ? error.message : error });
      return '潮汐 for iOS'; // 安全的fallback
    }
  }

  /**
   * 创建App Store评论推送卡片（使用新的v2组件系统）
   * @param review 评论数据
   * @param cardState 卡片状态: 'initial' | 'replying' | 'replied' | 'editing_reply'
   */
  createReviewCard(review: any, cardState: string = 'initial'): any {
    try {
      // 使用统一的 v2 卡片构建器
      const { buildReviewCardV2 } = require('../../utils/feishu-card-v2-builder');
      
      // 🔑 修复字段映射：从AppReview接口字段正确映射到卡片数据
      const reviewData = {
        id: review.reviewId || review.id || `review_${Date.now()}`,
        app_name: this.getAppNameById(review.appId) || '潮汐 for iOS', // 从配置中获取应用名称
        app_id: review.appId || review.app_id || '',
        title: review.title,
        content: review.body || review.content || '', // 使用body字段
        rating: review.rating || 0,
        author: review.reviewerNickname || review.author || '匿名', // 使用reviewerNickname字段
        store_type: review.store_type || 'ios',
        version: review.appVersion || review.version || review.app_version, // 🔍 使用appVersion字段
        date: review.createdDate ? review.createdDate.toISOString() : (review.date || new Date().toISOString()), // 使用createdDate字段
        country: review.territoryCode || review.country || review.territory_code, // 🔍 使用territoryCode字段
        verified_purchase: review.verified_purchase,
        helpful_count: review.helpful_count,
        developer_response: review.responseBody ? {
          body: review.responseBody,
          date: review.responseDate
        } : review.developer_response,
        // 添加卡片状态和消息ID
        card_state: cardState,
        message_id: review.feishuMessageId || review.feishu_message_id
      };

      return buildReviewCardV2(reviewData);
    } catch (error) {
      logger.error('使用v2卡片构建器失败，降级到简单模板', { error: error instanceof Error ? error.message : error });
      
      // 🔑 降级卡片也使用正确的字段映射
      const stars = '⭐'.repeat(Math.max(0, Math.min(5, review.rating || 0)));
      const storeIcon = 'ios' === 'ios' ? '📱' : '🤖';
      const appName = this.getAppNameById(review.appId) || '潮汐 for iOS';
      
      return {
        config: {
          wide_screen_mode: true,
          enable_forward: true
        },
        header: {
          title: {
            tag: "plain_text",
            content: `${storeIcon} ${appName} - 新评论通知`
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
