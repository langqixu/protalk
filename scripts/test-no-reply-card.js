#!/usr/bin/env node

/**
 * 测试无回复状态的卡片
 */

const https = require('https');

// 使用 buildReviewCardV2 创建测试卡片
function createTestCard() {
  // 模拟 buildReviewCardV2 的逻辑，但确保是无回复状态
  const testReviewData = {
    id: 'test_no_reply_manual',
    rating: 1,
    title: '[手动测试] 无回复状态',
    content: '这是一个手动创建的测试评论，应该显示输入框',
    author: '手动测试用户',
    date: new Date().toISOString(),
    app_name: '潮汐 for iOS',
    store_type: 'ios',
    version: '2.3.4',
    country: 'US',
    // 确保没有任何回复相关字段
    developer_response: null
  };

  // 模拟 buildReviewCardV2 的输出（无回复状态）
  const card = {
    config: { 
      wide_screen_mode: true,
      update_multi: true 
    },
    header: {
      title: { tag: 'plain_text', content: `${testReviewData.app_name} - 新评论通知` },
      template: 'red'
    },
    elements: [
      // 评分和用户信息
      {
        tag: 'div',
        text: { tag: 'lark_md', content: `⭐☆☆☆☆ (${testReviewData.rating}/5)` },
        fields: [
          { is_short: false, text: { tag: 'lark_md', content: `👤 ${testReviewData.author}` } }
        ]
      },
      // 评论内容
      {
        tag: 'div',
        text: { tag: 'lark_md', content: `**${testReviewData.title}**\n${testReviewData.content}` }
      },
      // 元信息
      {
        tag: 'div',
        fields: [
          { is_short: true, text: { tag: 'lark_md', content: `📅 ${new Date(testReviewData.date).toLocaleString('zh-CN')}` } },
          { is_short: true, text: { tag: 'lark_md', content: `📱 ${testReviewData.version}` } },
          { is_short: true, text: { tag: 'lark_md', content: `🇺🇸 ${testReviewData.country}` } }
        ]
      },
      // 分隔线
      { tag: 'hr' },
      // 重点：应该显示的表单部分
      {
        tag: 'form',
        name: 'reply_form',
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
                value: {
                  action: 'submit_reply',
                  review_id: testReviewData.id,
                  app_name: testReviewData.app_name,
                  author: testReviewData.author
                }
              }
            ]
          }
        ]
      }
    ]
  };

  return card;
}

function sendTestCard() {
  return new Promise((resolve, reject) => {
    const cardData = createTestCard();
    const data = JSON.stringify({ cardData });

    console.log('🧪 发送的卡片数据:');
    console.log(JSON.stringify(cardData, null, 2));
    console.log('\n📤 发送中...');

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
        console.log(`✅ 发送成功 (${res.statusCode}):`, responseData);
        resolve(responseData);
      });
    });

    req.on('error', (e) => {
      console.error('❌ 发送失败:', e);
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

sendTestCard().then(() => {
  console.log('\n🎉 手动测试卡片发送完成');
  console.log('📋 请检查飞书群组中是否收到了带有输入框的卡片');
}).catch(error => {
  console.error('❌ 测试失败:', error);
});
