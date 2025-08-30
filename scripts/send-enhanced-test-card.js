#!/usr/bin/env node

/**
 * 发送真正的增强版评论卡片进行测试
 */

const axios = require('axios');

const ZEABUR_URL = 'https://protalk.zeabur.app';
const CHAT_ID = 'oc_130c7aece1e0c64c817d4bc764d1b686';

// 构建增强版评论卡片
function buildEnhancedTestCard() {
  const reviewId = `enhanced_test_${Date.now()}`;
  
  return {
    config: {
      wide_screen_mode: true,
      update_multi: true
    },
    header: {
      title: {
        tag: "plain_text",
        content: "潮汐 for iOS - 新评论通知"
      },
      template: "red",
      icon: {
        tag: "standard_icon",
        token: "warning-hollow_filled"
      }
    },
    elements: [
      // 评分显示
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: "⭐⭐☆☆☆ (2/5)"
        }
      },
      // 评论内容
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: "**增强版卡片功能测试**\n这是一个用于测试增强版卡片5个状态切换的评论内容。请点击下面的按钮测试状态切换功能。"
        }
      },
      // 元信息
      {
        tag: "div",
        fields: [
          {
            is_short: true,
            text: {
              tag: "lark_md",
              content: "**日期:** 2025/08/30"
            }
          },
          {
            is_short: true,
            text: {
              tag: "lark_md",
              content: "**用户:** 增强版测试用户"
            }
          },
          {
            is_short: true,
            text: {
              tag: "lark_md",
              content: "**版本:** 2.3.4"
            }
          },
          {
            is_short: true,
            text: {
              tag: "lark_md",
              content: "**地区:** 🇨🇳 中国"
            }
          }
        ]
      },
      // 分隔线
      {
        tag: "hr"
      },
      // 操作按钮
      {
        tag: "action",
        actions: [
          {
            tag: "button",
            text: {
              tag: "plain_text",
              content: "回复"
            },
            type: "primary",
            action_type: "request",
            value: {
              action: "reply_review",
              review_id: reviewId,
              app_name: "潮汐 for iOS",
              author: "增强版测试用户"
            }
          },
          {
            tag: "button",
            text: {
              tag: "plain_text",
              content: "报告问题"
            },
            type: "default",
            action_type: "request",
            value: {
              action: "report_issue",
              review_id: reviewId,
              app_name: "潮汐 for iOS",
              author: "增强版测试用户"
            }
          }
        ]
      }
    ]
  };
}

async function sendEnhancedCard() {
  try {
    console.log('🚀 发送真正的增强版评论卡片...');
    
    const cardData = buildEnhancedTestCard();
    
    const response = await axios.post(`${ZEABUR_URL}/feishu/messages/card`, {
      card: cardData,
      chat_id: CHAT_ID
    });
    
    if (response.data.success) {
      console.log('✅ 增强版评论卡片发送成功！');
      console.log('🧪 现在请在飞书中测试：');
      console.log('1. 点击"回复"按钮 → 应该切换到回复表单状态');
      console.log('2. 点击"报告问题"按钮 → 应该切换到问题报告表单状态');
      console.log('3. 验证是否能看到完整的评论信息（星级、内容、元数据）');
    } else {
      console.error('❌ 卡片发送失败:', response.data);
    }
  } catch (error) {
    console.error('❌ 发送增强版卡片失败:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('🎯 发送真正的增强版评论卡片测试');
  console.log('================================');
  
  await sendEnhancedCard();
}

if (require.main === module) {
  main().catch(console.error);
}
