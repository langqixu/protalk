#!/usr/bin/env node

/**
 * 测试传统的value按钮格式
 */

const http = require('http');

function createTraditionalButtonCard() {
  return {
    config: { 
      wide_screen_mode: true,
      update_multi: true 
    },
    header: {
      title: { tag: 'plain_text', content: '🧪 传统按钮测试' },
      template: 'blue'
    },
    elements: [
      {
        tag: 'div',
        text: { tag: 'lark_md', content: '**测试目标**：验证传统 value 按钮格式' }
      },
      { tag: 'hr' },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '传统格式按钮' },
            type: 'primary',
            action_type: 'request',
            value: {
              action: 'test_traditional',
              test_id: 'traditional_test_001',
              timestamp: Date.now()
            }
          }
        ]
      }
    ]
  };
}

function sendTraditionalCard() {
  return new Promise((resolve, reject) => {
    const cardData = createTraditionalButtonCard();
    const data = JSON.stringify({ cardData });

    console.log('🧪 发送传统按钮测试卡片:');
    console.log(JSON.stringify(cardData, null, 2));
    console.log('\n📤 发送中...');

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/feishu/test/custom-card',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
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

sendTraditionalCard().then(() => {
  console.log('\n🎉 传统按钮测试卡片发送完成');
  console.log('📋 这次应该能看到按钮了！');
  console.log('🔍 格式特点：');
  console.log('   1. 使用 action 容器包装按钮');
  console.log('   2. 使用 value 而不是 behaviors');
  console.log('   3. 设置 action_type: "request"');
}).catch(error => {
  console.error('❌ 测试失败:', error);
});
