#!/usr/bin/env node

/**
 * 测试不同状态的卡片构建
 */

const https = require('https');

// 测试无回复的评论数据
const testReviewNoReply = {
  id: 'test_no_reply',
  rating: 1,
  title: '[测试] 无回复评论',
  content: '这是一个没有开发者回复的测试评论',
  author: '测试用户',
  date: new Date().toISOString(),
  app_name: '潮汐 for iOS',
  store_type: 'ios',
  version: '2.3.4',
  country: 'US',
  // 没有 developer_response
};

// 测试有回复的评论数据
const testReviewWithReply = {
  id: 'test_with_reply',
  rating: 5,
  title: '[测试] 有回复评论',
  content: '这是一个有开发者回复的测试评论',
  author: '测试用户2',
  date: new Date().toISOString(),
  app_name: '潮汐 for iOS',
  store_type: 'ios',
  version: '2.3.4',
  country: 'CN',
  developer_response: {
    body: '感谢您的反馈，我们已经在新版本中修复了这个问题。',
    date: new Date().toISOString()
  }
};

function sendTestCard(cardData, testName) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ cardData });

    const options = {
      hostname: 'protalk.zeabur.app',
      port: 443,
      path: '/feishu/test/simple-button',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ ${testName} 发送成功 (${res.statusCode}):`, responseData);
        resolve(responseData);
      });
    });

    req.on('error', (e) => {
      console.error(`❌ ${testName} 发送失败:`, e);
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

// 简单测试卡片（用于验证基础功能）
const simpleTestCard = {
  config: { wide_screen_mode: true },
  header: {
    title: { tag: 'plain_text', content: '🧪 状态测试卡片' },
    template: 'blue'
  },
  elements: [
    {
      tag: 'div',
      text: { tag: 'lark_md', content: '**测试1**: 无回复状态（应该显示输入框）' }
    },
    {
      tag: 'hr'
    },
    {
      tag: 'form',
      name: 'test_form',
      elements: [
        {
          tag: 'div',
          text: { tag: 'lark_md', content: '💬 **开发者回复**' }
        },
        {
          tag: 'input',
          name: 'reply_content',
          placeholder: { tag: 'plain_text', content: '回复用户...' },
          required: true,
          max_length: 1000,
          width: 'fill'
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '提交回复' },
              type: 'primary',
              action_type: 'request',
              form_action_type: 'submit',
              value: { action: 'test_submit' }
            }
          ]
        }
      ]
    }
  ]
};

async function runTests() {
  console.log('🧪 开始测试卡片状态...\n');
  
  try {
    // 测试1: 发送简单测试卡片
    await sendTestCard(simpleTestCard, '简单测试卡片');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

runTests().then(() => {
  console.log('\n🎉 测试完成');
}).catch(error => {
  console.error('❌ 测试脚本失败:', error);
});
