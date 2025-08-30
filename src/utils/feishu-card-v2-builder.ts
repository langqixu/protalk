/**
 * 飞书卡片v2组件构建器
 * 基于最新的飞书卡片JSON v2规范
 * @see https://open.feishu.cn/document/feishu-cards/card-json-v2-structure
 * @see https://open.feishu.cn/document/feishu-cards/card-json-v2-components/component-json-v2-overview
 */

import { FeishuCardV2 } from '../types';
import logger from './logger';
import { CardState, ReviewDTO } from '../types/review';

/**
 * Builds an interactive App Store review card using Feishu Card V2 components.
 * This is the single source of truth for generating review cards.
 *
 * @param review - The review data, conforming to the ReviewDTO.
 * @param state - The desired card state, from the CardState enum.
 * @returns A FeishuCardV2 object ready to be sent.
 */
export function buildReviewCardV2(review: ReviewDTO, state: CardState): FeishuCardV2 {
  logger.info(`Building review card for review ${review.id} with state ${state}`);

  const card: FeishuCardV2 = {
    config: {
      wide_screen_mode: true,
      update_multi: true,
    },
    header: {
      title: { tag: 'plain_text', content: `${review.appName} - 新评论通知` },
      template: review.rating <= 2 ? 'red' : review.rating === 5 ? 'green' : 'blue',
    },
    elements: [
      buildReviewInfo(review),
      { tag: 'hr' },
      buildActionElements(review, state),
    ],
  };

  return card;
}

/**
 * Builds the main block displaying the review's content and metadata.
 */
function buildReviewInfo(review: ReviewDTO): any {
  const stars = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
  const formattedDate = new Date(review.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

  return {
    tag: 'div',
    fields: [
      {
        is_short: false,
        text: {
          tag: 'lark_md',
          content: `${stars} (${review.rating}/5)`,
        },
      },
      {
        is_short: false,
        text: {
          tag: 'lark_md',
          content: `**${review.title}**\n${review.body}`,
        },
      },
      {
        is_short: true,
        text: {
          tag: 'lark_md',
          content: `**用户:** ${review.author}`,
        },
      },
      {
        is_short: true,
        text: {
          tag: 'lark_md',
          content: `**地区:** ${review.countryCode}`,
        },
      },
      {
        is_short: true,
        text: {
          tag: 'lark_md',
          content: `**版本:** ${review.version}`,
        },
      },
      {
        is_short: true,
        text: {
          tag: 'lark_md',
          content: `**时间:** ${formattedDate}`,
        },
      },
    ],
  };
}

/**
 * Builds the interactive action elements based on the card's state.
 */
function buildActionElements(review: ReviewDTO, state: CardState): any {
  switch (state) {
    case CardState.NO_REPLY:
      return {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '回复' },
            type: 'primary',
            value: {
              action: CardState.REPLYING,
              review_id: review.id,
            },
          },
        ],
      };

    case CardState.REPLYING:
      return {
        tag: 'form',
        elements: [
          {
            tag: 'input',
            name: 'reply_content',
            placeholder: { tag: 'plain_text', content: '请输入回复内容...' },
            is_multiline: true,
          },
          {
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: { tag: 'plain_text', content: '提交' },
                type: 'primary',
                form_action_type: 'submit',
                value: {
                  action: CardState.REPLIED,
                  review_id: review.id,
                },
              },
              {
                tag: 'button',
                text: { tag: 'plain_text', content: '取消' },
                type: 'default',
                value: {
                  action: CardState.NO_REPLY,
                  review_id: review.id,
                },
              },
            ],
          },
        ],
      };
      
    case CardState.REPLIED:
      return {
        tag: 'div',
        fields: [
            {
                is_short: false,
                text: {
                    tag: 'lark_md',
                    content: `**开发者回复:**\n${review.developerResponse?.body || ''}`
                }
            }
        ],
        extra: {
            tag: 'button',
            text: { tag: 'plain_text', content: '编辑回复' },
            type: 'default',
            value: {
                action: CardState.EDITING_REPLY,
                review_id: review.id,
            }
        }
      };

    case CardState.EDITING_REPLY:
      return {
        tag: 'form',
        elements: [
          {
            tag: 'input',
            name: 'reply_content',
            placeholder: { tag: 'plain_text', content: '请输入回复内容...' },
            is_multiline: true,
            default_value: review.developerResponse?.body || '',
          },
          {
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: { tag: 'plain_text', content: '更新' },
                type: 'primary',
                form_action_type: 'submit',
                value: {
                  action: CardState.REPLIED,
                  review_id: review.id,
                },
              },
              {
                tag: 'button',
                text: { tag: 'plain_text', content: '取消' },
                type: 'default',
                value: {
                  action: CardState.REPLIED,
                  review_id: review.id,
                },
              },
            ],
          },
        ],
      };

    default:
      logger.warn(`Unknown card state: ${state}, falling back to no_reply`);
      return buildActionElements(review, CardState.NO_REPLY);
  }
}
