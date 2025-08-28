import axios, { AxiosInstance } from 'axios';
import { IPusher, Review } from '../../types';
import { EnvConfig } from '../../types';
import logger from '../../utils/logger';

interface FeishuConfig {
  feishu: EnvConfig['feishu'];
}

interface FeishuMessage {
  msg_type: 'interactive';
  card: {
    header: {
      title: {
        tag: 'plain_text';
        content: string;
      };
    };
    elements: Array<{
      tag: 'div';
      text: {
        tag: 'lark_md';
        content: string;
      };
    }>;
  };
}

export class FeishuPusher implements IPusher {
  private httpClient: AxiosInstance;
  private webhookUrl: string;
  private bot: any; // FeishuBot 实例

  constructor(config: FeishuConfig, bot?: any) {
    this.webhookUrl = config.feishu.webhookUrl;
    this.bot = bot;
    
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.info('飞书推送器初始化成功');
  }

  /**
   * 推送评论更新到飞书
   */
  async pushReviewUpdate(review: Review, type: 'new' | 'update' | 'reply'): Promise<void> {
    try {
      const message = this.buildMessage(review, type);
      
      const response = await this.httpClient.post(this.webhookUrl, message);
      
      if (response.status !== 200) {
        throw new Error(`飞书API返回错误状态码: ${response.status}`);
      }

      // 存储评论映射（如果有bot实例）
      if (this.bot && response.data && response.data.data && response.data.data.message_id) {
        await this.bot.storeCommentMapping({
          messageId: response.data.data.message_id,
          reviewId: review.id,
          appId: review.appId,
          storeType: 'appstore', // 可以根据review.appId判断商店类型
          threadId: response.data.data.thread_id
        });
      }

      logger.info('飞书推送成功', { 
        reviewId: review.id, 
        type, 
        appId: review.appId 
      });
    } catch (error) {
      logger.error('飞书推送失败', { 
        reviewId: review.id, 
        type, 
        error: error instanceof Error ? error.message : error 
      });
      
      // 重试一次
      await this.retryPush(review, type);
    }
  }

  /**
   * 重试推送
   */
  private async retryPush(review: Review, type: 'new' | 'update' | 'reply'): Promise<void> {
    try {
      logger.info('尝试重试飞书推送', { reviewId: review.id, type });
      
      const message = this.buildMessage(review, type);
      const response = await this.httpClient.post(this.webhookUrl, message);
      
      if (response.status === 200) {
        logger.info('飞书推送重试成功', { reviewId: review.id, type });
      } else {
        throw new Error(`重试失败，状态码: ${response.status}`);
      }
    } catch (error) {
      logger.error('飞书推送重试失败', { 
        reviewId: review.id, 
        type, 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 构建飞书消息
   */
  private buildMessage(review: Review, type: 'new' | 'update' | 'reply'): FeishuMessage {
    const titleMap = {
      new: '⭐ 新评论',
      update: '🔄 评论更新',
      reply: '💬 评论回复'
    };

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
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: titleMap[type]
          }
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: content
            }
          }
        ]
      }
    };
  }

  /**
   * 批量推送评论更新
   */
  async pushBatchUpdates(reviews: Review[], type: 'new' | 'update' | 'reply'): Promise<void> {
    if (reviews.length === 0) {
      logger.debug('没有评论需要推送');
      return;
    }

    logger.info('开始批量推送评论更新', { count: reviews.length, type });

    const promises = reviews.map(review => this.pushReviewUpdate(review, type));
    
    try {
      await Promise.allSettled(promises);
      logger.info('批量推送完成', { count: reviews.length, type });
    } catch (error) {
      logger.error('批量推送过程中发生错误', { 
        error: error instanceof Error ? error.message : error 
      });
    }
  }

  /**
   * 测试飞书连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const testMessage: FeishuMessage = {
        msg_type: 'interactive',
        card: {
          header: {
            title: {
              tag: 'plain_text',
              content: 'App Store 评论服务连接测试'
            }
          },
          elements: [
            {
              tag: 'div',
              text: {
                tag: 'lark_md',
                content: '✅ 飞书推送服务连接正常\n\n时间：' + new Date().toLocaleString('zh-CN')
              }
            }
          ]
        }
      };

      const response = await this.httpClient.post(this.webhookUrl, testMessage);
      const success = response.status === 200;
      
      logger.info('飞书连接测试结果', { success });
      return success;
    } catch (error) {
      logger.error('飞书连接测试失败', { 
        error: error instanceof Error ? error.message : error 
      });
      return false;
    }
  }
}
