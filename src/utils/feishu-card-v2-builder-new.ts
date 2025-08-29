/**
 * 新的卡片构建器 - 完全参考飞书官方示例
 */

import logger from './logger';
import { FeishuCardV2, CardHeader } from './feishu-card-v2-builder';

/**
 * 获取国家旗帜emoji
 */
function getCountryFlag(countryCode: string): string {
  const flags: { [key: string]: string } = {
    'CN': '🇨🇳', 'US': '🇺🇸', 'JP': '🇯🇵', 'KR': '🇰🇷', 'GB': '🇬🇧',
    'FR': '🇫🇷', 'DE': '🇩🇪', 'AU': '🇦🇺', 'CA': '🇨🇦', 'SG': '🇸🇬',
    'HK': '🇭🇰', 'TW': '🇹🇼', 'MY': '🇲🇾', 'TH': '🇹🇭', 'IN': '🇮🇳'
  };
  return flags[countryCode?.toUpperCase()] || '🌍';
}

/**
 * 构建评论卡片V2 - 完全参考官方示例设计
 */
export function buildReviewCardV2New(reviewData: {
  id: string;
  rating: number;
  title?: string;
  content: string;
  author: string;
  date: string;
  app_name: string;
  store_type?: string;
  helpful_count?: number;
  developer_response?: any;
  version?: string;
  country?: string;
  card_state?: string;
  message_id?: string;
}): FeishuCardV2 {
  
  // 动态确定卡片状态
  const hasReply = reviewData.developer_response && reviewData.developer_response.body;
  const cardState = hasReply ? 'replied' : 'initial';
  
  logger.debug('构建新版评论卡片', { 
    reviewId: reviewData.id,
    cardState,
    hasReply
  });

  // 构建评分显示
  const stars = '⭐'.repeat(Math.max(0, Math.min(5, reviewData.rating || 0)));
  const emptyStars = '☆'.repeat(5 - Math.max(0, Math.min(5, reviewData.rating || 0)));
  
  // 格式化日期
  const dateStr = new Date(reviewData.date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // 获取国家旗帜
  const countryFlag = getCountryFlag(reviewData.country || '');
  const countryDisplay = `${countryFlag} ${reviewData.country || '未知'}`;

  const card: FeishuCardV2 = {
    config: { 
      wide_screen_mode: true,
      update_multi: true 
    },
    header: {
      title: { tag: 'plain_text', content: `${reviewData.app_name} - 新评论通知` },
      template: 'red',
      icon: { tag: 'standard_icon', token: 'warning-hollow_filled' },
      padding: '12px 12px 12px 12px'
    },
    elements: [
      // 评分和用户名
      {
        tag: 'column_set',
        horizontal_spacing: '8px',
        horizontal_align: 'left',
        columns: [
          {
            tag: 'column',
            width: 'weighted',
            weight: 1,
            elements: [
              {
                tag: 'markdown',
                content: ` ${stars}${emptyStars} (${reviewData.rating}/5)`,
                text_align: 'left',
                text_size: 'heading',
                margin: '0px 0px 0px 0px'
              }
            ],
            vertical_spacing: '8px',
            horizontal_align: 'left',
            vertical_align: 'top'
          },
          {
            tag: 'column', 
            width: 'weighted',
            weight: 1,
            elements: [
              {
                tag: 'markdown',
                content: `${reviewData.author}`,
                text_align: 'left',
                text_size: 'normal_v2',
                margin: '0px 0px 0px 0px',
                icon: {
                  tag: 'standard_icon',
                  token: 'member_outlined',
                  color: 'grey'
                }
              }
            ],
            vertical_spacing: '8px',
            horizontal_align: 'left',
            vertical_align: 'top'
          }
        ],
        margin: '0px 0px 0px 0px'
      },
      
      // 评论标题和内容
      {
        tag: 'column_set',
        horizontal_spacing: '8px',
        horizontal_align: 'left',
        columns: [
          {
            tag: 'column',
            width: 'weighted',
            weight: 1,
            elements: [
              {
                tag: 'markdown',
                content: `**${reviewData.title || '此处为评论标题'}**\n${reviewData.content}`,
                text_align: 'left',
                text_size: 'normal_v2',
                margin: '0px 0px 0px 0px'
              }
            ],
            vertical_spacing: '8px',
            horizontal_align: 'left',
            vertical_align: 'top'
          }
        ],
        margin: '0px 0px 0px 0px'
      },
      
      // 元信息（日期、版本、国家）
      {
        tag: 'column_set',
        horizontal_spacing: '8px',
        horizontal_align: 'left',
        columns: [
          {
            tag: 'column',
            width: 'weighted',
            weight: 1,
            elements: [
              {
                tag: 'div',
                text: {
                  tag: 'plain_text',
                  content: dateStr,
                  text_size: 'notation',
                  text_align: 'left',
                  text_color: 'grey'
                },
                icon: {
                  tag: 'standard_icon',
                  token: 'calendar-date_outlined',
                  color: 'grey'
                },
                margin: '0px 0px 0px 0px'
              }
            ],
            vertical_spacing: '8px',
            horizontal_align: 'left',
            vertical_align: 'top'
          },
          {
            tag: 'column',
            width: 'weighted',
            weight: 1,
            elements: [
              {
                tag: 'div',
                text: {
                  tag: 'plain_text',
                  content: reviewData.version || '未知版本',
                  text_size: 'notation',
                  text_align: 'left',
                  text_color: 'grey'
                },
                icon: {
                  tag: 'standard_icon',
                  token: 'platform_outlined',
                  color: 'grey'
                },
                margin: '0px 0px 0px 0px'
              }
            ],
            vertical_align: 'top'
          },
          {
            tag: 'column',
            width: 'weighted',
            weight: 1,
            elements: [
              {
                tag: 'div',
                text: {
                  tag: 'plain_text',
                  content: countryDisplay,
                  text_size: 'notation',
                  text_align: 'left',
                  text_color: 'grey'
                },
                icon: {
                  tag: 'standard_icon',
                  token: 'internet_outlined',
                  color: 'grey'
                },
                margin: '0px 0px 0px 0px'
              }
            ],
            vertical_align: 'top'
          }
        ],
        margin: '0px 0px 0px 0px'
      },
      
      // 分隔线
      {
        tag: 'hr',
        margin: '0px 0px 0px 0px'
      }
    ]
  };

  // 根据状态添加不同的交互元素
  if (cardState === 'replied') {
    // 已回复状态：显示回复内容 + 编辑按钮
    const replyContent = reviewData.developer_response?.body || '暂无回复内容';
    
    card.elements.push({
      tag: 'column_set',
      horizontal_spacing: '8px',
      horizontal_align: 'left',
      columns: [
        {
          tag: 'column',
          width: 'weighted',
          weight: 4,
          elements: [
            {
              tag: 'div',
              text: {
                tag: 'plain_text',
                content: replyContent,
                text_size: 'notation',
                text_align: 'left',
                text_color: 'grey'
              },
              icon: {
                tag: 'standard_icon',
                token: 'chat-done_outlined',
                color: 'grey'
              },
              margin: '0px 0px 0px 0px'
            }
          ],
          vertical_align: 'top'
        },
        {
          tag: 'column',
          width: 'weighted',
          weight: 1,
          elements: [
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '编辑' },
              type: 'primary_text',
              width: 'default',
              size: 'small',
              icon: {
                tag: 'standard_icon',
                token: 'ccm-edit_outlined'
              },
              action_type: 'request',
              value: {
                action: 'edit_reply',
                review_id: reviewData.id,
                app_name: reviewData.app_name,
                author: reviewData.author
              },
              margin: '0px 0px 0px 0px'
            }
          ],
          vertical_align: 'top'
        }
      ],
      margin: '0px 0px 0px 0px'
    });
    
  } else {
    // 初始状态：显示输入框 + 提交按钮
    card.elements.push({
      tag: 'form',
      name: 'reply_form',
      elements: [
        {
          tag: 'column_set',
          horizontal_spacing: '8px',
          horizontal_align: 'left',
          columns: [
            {
              tag: 'column',
              width: 'weighted',
              weight: 5,
              elements: [
                {
                  tag: 'input',
                  placeholder: { tag: 'plain_text', content: '回复用户...' },
                  default_value: '',
                  width: 'fill',
                  name: 'reply_content',
                  margin: '0px 0px 0px 0px',
                  required: true,
                  max_length: 1000
                }
              ],
              vertical_align: 'top'
            },
            {
              tag: 'column',
              width: 'weighted',
              weight: 1,
              elements: [
                {
                  tag: 'button',
                  text: { tag: 'plain_text', content: '提交' },
                  type: 'primary',
                  width: 'fill',
                  size: 'medium',
                  form_action_type: 'submit',
                  action_type: 'request',
                  value: {
                    action: 'submit_reply',
                    review_id: reviewData.id,
                    app_name: reviewData.app_name,
                    author: reviewData.author
                  }
                }
              ],
              vertical_align: 'top'
            }
          ],
          margin: '0px 0px 0px 0px'
        }
      ],
      direction: 'vertical',
      padding: '4px 0px 4px 0px',
      margin: '0px 0px 0px 0px'
    });
  }

  return card;
}
