#!/usr/bin/env node

/**
 * 简单的卡片交互测试
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testSimpleCard() {
  try {
    console.log('🧪 测试简单卡片发送...');
    
    // 构造一个简单的评论卡片
    const simpleCard = {
      config: {
        wide_screen_mode: true
      },
      header: {
        title: {
          tag: 'plain_text',
          content: '📱 潮汐 for iOS - 新评论通知'
        },
        template: 'blue'
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: '**评分**: ⭐⭐⭐⭐ 4/5\n**用户**: 测试用户'
          }
        },
        {
          tag: 'hr'
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: '**评论内容**\n这个应用很好用，界面设计很棒！'
          }
        },
        {
          tag: 'hr'
        },
        {
          tag: 'input',
          name: 'reply_content',
          placeholder: {
            tag: 'plain_text',
            content: '在此输入您的回复内容...'
          },
          required: true,
          max_length: 1000,
          width: 'fill'
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: {
                tag: 'plain_text',
                content: '📤 提交回复'
              },
              type: 'primary',
              action_type: 'request',
              value: {
                action: 'submit_reply',
                review_id: 'test_review_001',
                app_id: '1077776989'
              }
            },
            {
              tag: 'button',
              text: {
                tag: 'plain_text',
                content: '📊 查看详情'
              },
              type: 'default',
              action_type: 'link',
              url: 'https://apps.apple.com/app/id1077776989'
            }
          ]
        }
      ]
    };

    const response = await axios.post(`${BASE_URL}/feishu/messages/card`, {
      card: simpleCard
    });

    console.log('✅ 卡片发送成功!', response.data);
    
    // 测试成功状态卡片
    console.log('\n🟢 测试成功状态卡片...');
    const successCard = {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: '✅ 回复提交成功' },
        template: 'green'
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: '**回复内容已成功提交**\n\n感谢您的反馈！我们会继续努力改进产品。\n\n回复将在App Store审核后对用户可见。'
          }
        }
      ]
    };

    const successResponse = await axios.post(`${BASE_URL}/feishu/messages/card`, {
      card: successCard
    });

    console.log('✅ 成功状态卡片发送成功!', successResponse.data);

    // 测试失败状态卡片
    console.log('\n🔴 测试失败状态卡片...');
    const errorCard = {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: '❌ 回复提交失败' },
        template: 'red'
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: '**回复提交遇到问题**\n\n错误信息：网络连接超时\n\n请检查网络连接或稍后重试。'
          }
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '🔄 重试' },
              type: 'primary',
              action_type: 'request',
              value: { action: 'retry_reply', review_id: 'test_review_001' }
            }
          ]
        }
      ]
    };

    const errorResponse = await axios.post(`${BASE_URL}/feishu/messages/card`, {
      card: errorCard
    });

    console.log('✅ 失败状态卡片发送成功!', errorResponse.data);
    
    console.log('\n🎉 所有卡片测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testSimpleCard();