/**
 * 富文本消息工厂
 * 统一管理各种类型的富文本消息生成
 */

import { FeishuCardV2 } from './feishu-card-v2-builder';
import { AppReview } from '../types';
// import { 
//   ReviewCardTemplates, 
//   createReviewCard,
//   createCompactReviewCard 
// } from './review-card-templates';
import logger from './logger';

// ================================
// 富文本消息类型定义
// ================================

export interface RichTextContent {
  post: {
    [locale: string]: {
      title?: string;
      content: Array<Array<{
        tag: 'text' | 'a' | 'at';
        text: string;
        href?: string;
        style?: {
          bold?: boolean;
          italic?: boolean;
          strikethrough?: boolean;
          underline?: boolean;
        };
      }>>;
    };
  };
}

export interface SystemNotification {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  action?: {
    text: string;
    url?: string;
    callback?: string;
  };
}

export interface ServiceStatus {
  service: string;
  status: 'running' | 'stopped' | 'error';
  version: string;
  uptime: number;
  details?: Record<string, any>;
}

// ================================
// 富文本消息工厂类
// ================================

export class RichTextFactory {
  /**
   * 根据appId获取应用名称
   */
  private static getAppNameById(appId: string): string {
    try {
      const { loadConfig } = require('../config');
      const config = loadConfig();
      const store = config.stores.find((s: any) => s.appId === appId);
      return store?.name || '未知应用';
    } catch (error) {
      logger.warn('获取应用名称失败', { appId, error });
      return '未知应用';
    }
  }
  
  /**
   * 创建App Store评论富文本卡片
   */
  static createReviewMessage(review: AppReview, _compact: boolean = false): FeishuCardV2 {
    try {
      // 使用修复后的 buildReviewCardV2 函数
      const { buildReviewCardV2 } = require('./feishu-card-v2-builder');
      
              // 🔧 修复字段映射：确保所有字段正确对应
        const reviewData = {
          id: review.reviewId,
          app_name: this.getAppNameById(review.appId) || '潮汐 for iOS',
          rating: review.rating,
          title: review.title,
          content: review.body || '',
          author: review.reviewerNickname || '匿名用户',
          date: review.createdDate.toISOString(),
          store_type: 'ios',
          helpful_count: review.helpful_count,
          developer_response: review.responseBody ? {
            body: review.responseBody,
            date: review.responseDate
          } : undefined
        };
      
      return buildReviewCardV2(reviewData);
    } catch (error) {
      logger.error('创建评论卡片失败', { 
        error: error instanceof Error ? error.message : error,
        reviewId: review.reviewId 
      });
      
      // 降级到简单文本卡片
      return this.createFallbackReviewCard(review);
    }
  }

  /**
   * 创建评论摘要报告
   */
  static createReviewSummaryMessage(
    appName: string,
    reviews: AppReview[]
  ): FeishuCardV2 {
    // 简化实现
    
    // return ReviewCardTemplates.createReviewSummaryCard(appName, reviews, {
    // 暂时返回简单卡片
    return {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: '📊 评论汇总' },
        template: 'blue'
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**${appName}** 的评论汇总\n共 ${reviews.length} 条评论`
          }
        }
      ]
    } as FeishuCardV2;
  }

  /**
   * 创建系统通知消息
   */
  static createSystemNotification(notification: SystemNotification): FeishuCardV2 {
    const { type, title, message, action } = notification;
    
    // 根据类型选择模板和图标
    const config = this.getNotificationConfig(type);
    
    const cardBuilder = {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text' as const, content: `${config.icon} ${title}` },
        template: config.template
      },
      elements: [
        {
          tag: 'div' as const,
          text: {
            tag: 'lark_md' as const,
            content: message
          }
        }
      ]
    };

    // 添加操作按钮
    if (action) {
      (cardBuilder.elements as any[]).push({
        tag: 'hr'
      });
      
      (cardBuilder.elements as any[]).push({
        tag: 'action',
        actions: [{
                  tag: 'button',
        text: { tag: 'plain_text', content: action.text },
        type: 'primary',
        action_type: action.url ? 'link' : 'request',
        ...(action.url && { url: action.url }),
        ...(action.callback && { value: { callback: action.callback } })
        }]
      });
    }

    return cardBuilder as FeishuCardV2;
  }

  /**
   * 创建服务状态报告
   */
  static createServiceStatusMessage(status: ServiceStatus): FeishuCardV2 {
    const statusConfig = this.getStatusConfig(status.status);
    const uptimeFormatted = this.formatUptime(status.uptime);

    return {
      config: { wide_screen_mode: true },
      header: {
        title: { 
          tag: 'plain_text', 
          content: `${statusConfig.icon} ${status.service} 服务状态` 
        },
        template: statusConfig.template
      },
      elements: [
        {
          tag: 'div',
          fields: [
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**状态**\n${statusConfig.text}`
              }
            },
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**版本**\n${status.version}`
              }
            },
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**运行时间**\n${uptimeFormatted}`
              }
            },
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**更新时间**\n${new Date().toLocaleString('zh-CN')}`
              }
            }
          ]
        }
      ]
    } as FeishuCardV2;
  }

  /**
   * 创建传统富文本消息（post格式）
   */
  static createLegacyRichText(
    title: string,
    content: string,
    links?: Array<{ text: string; url: string }>
  ): RichTextContent {
    const textElements: Array<{
      tag: 'text' | 'a';
      text: string;
      href?: string;
      style?: any;
    }> = [
      {
        tag: 'text',
        text: content
      }
    ];

    // 添加链接
    if (links && links.length > 0) {
      textElements.push({
        tag: 'text',
        text: '\n\n相关链接:\n'
      });
      
      links.forEach((link, index) => {
        if (index > 0) {
          textElements.push({
            tag: 'text',
            text: '\n'
          });
        }
        textElements.push({
          tag: 'a',
          text: link.text,
          href: link.url
        });
      });
    }

    return {
      post: {
        zh_cn: {
          title,
          content: [textElements]
        }
      }
    };
  }

  /**
   * 创建评论批量处理报告
   */
  static createBatchProcessReport(
    processedCount: number,
    successCount: number,
    failedCount: number,
    duration: number
  ): FeishuCardV2 {
    const successRate = processedCount > 0 ? (successCount / processedCount * 100).toFixed(1) : '0';
    const template = failedCount === 0 ? 'green' : failedCount < successCount ? 'yellow' : 'red';

    return {
      config: { wide_screen_mode: true },
      header: {
        title: { 
          tag: 'plain_text', 
          content: '📊 评论处理报告' 
        },
        template
      },
      elements: [
        {
          tag: 'div',
          fields: [
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**处理总数**\n${processedCount}`
              }
            },
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**成功数量**\n✅ ${successCount}`
              }
            },
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**失败数量**\n❌ ${failedCount}`
              }
            },
            {
              is_short: true,
              text: {
                tag: 'lark_md',
                content: `**成功率**\n${successRate}%`
              }
            }
          ]
        },
        {
          tag: 'hr'
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**处理耗时**: ${this.formatDuration(duration)}\n**完成时间**: ${new Date().toLocaleString('zh-CN')}`
          }
        }
      ]
    } as FeishuCardV2;
  }

  // ================================
  // 辅助方法
  // ================================

  /**
   * 计算评论统计数据 (暂时未使用)
   */
  // 暂时注释掉未使用的方法

  /**
   * 获取通知类型配置
   */
  private static getNotificationConfig(type: SystemNotification['type']) {
    const configs = {
      info: { icon: 'ℹ️', template: 'blue' as const },
      success: { icon: '✅', template: 'green' as const },
      warning: { icon: '⚠️', template: 'yellow' as const },
      error: { icon: '❌', template: 'red' as const }
    };
    return configs[type];
  }

  /**
   * 获取服务状态配置
   */
  private static getStatusConfig(status: ServiceStatus['status']) {
    const configs = {
      running: { icon: '🟢', text: '正常运行', template: 'green' as const },
      stopped: { icon: '🔴', text: '已停止', template: 'red' as const },
      error: { icon: '🟡', text: '异常状态', template: 'yellow' as const }
    };
    return configs[status];
  }

  /**
   * 格式化运行时间
   */
  private static formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}天 ${hours}小时`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  }

  /**
   * 格式化持续时间
   */
  private static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}分钟 ${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  /**
   * 创建降级评论卡片（当主卡片创建失败时使用）
   */
  private static createFallbackReviewCard(review: AppReview): FeishuCardV2 {
    const stars = '⭐'.repeat(Math.max(0, Math.min(5, review.rating || 0)));
    const storeIcon = '📱'; // 默认iOS

    return {
      config: { wide_screen_mode: true },
      header: {
        title: { 
          tag: 'plain_text', 
          content: `${storeIcon} App Store - 评论通知` 
        },
        template: 'blue'
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**评分**: ${stars} ${review.rating}/5\n**用户**: ${review.reviewerNickname || '匿名'}\n**内容**: ${review.body || '无内容'}`
          }
        }
      ]
    } as FeishuCardV2;
  }

  /**
   * 验证富文本内容
   */
  static validateRichText(content: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      if (typeof content !== 'object' || content === null) {
        errors.push('内容必须是对象');
        return { valid: false, errors };
      }

      // 验证卡片格式
      if (content.config || content.header || content.elements) {
        if (!content.elements || !Array.isArray(content.elements)) {
          errors.push('卡片必须包含elements数组');
        }
      }
      
      // 验证传统post格式
      else if (content.post) {
        if (typeof content.post !== 'object') {
          errors.push('post内容必须是对象');
        }
      }
      
      else {
        errors.push('无法识别的富文本格式');
      }

    } catch (error) {
      errors.push(`验证过程出错: ${error instanceof Error ? error.message : error}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// ================================
// 便捷导出函数
// ================================

/**
 * 快速创建评论通知
 */
export function createQuickReviewNotification(review: AppReview): FeishuCardV2 {
  return RichTextFactory.createReviewMessage(review);
}

/**
 * 快速创建系统通知
 */
export function createQuickSystemNotification(
  type: SystemNotification['type'],
  title: string,
  message: string
): FeishuCardV2 {
  return RichTextFactory.createSystemNotification({ type, title, message });
}

/**
 * 快速创建服务状态报告
 */
export function createQuickStatusReport(
  service: string,
  status: ServiceStatus['status'],
  version: string = '1.0.0',
  uptime: number = 0
): FeishuCardV2 {
  return RichTextFactory.createServiceStatusMessage({
    service,
    status,
    version,
    uptime
  });
}

export default {
  RichTextFactory,
  createQuickReviewNotification,
  createQuickSystemNotification,
  createQuickStatusReport
};
