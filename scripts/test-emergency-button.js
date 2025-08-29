#!/usr/bin/env node

const https = require('https');

const cardData = {
  cardData: {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: '🚨 紧急诊断 - 最简单按钮' },
      template: 'red'
    },
    elements: [
      {
        tag: 'div',
        text: { 
          tag: 'plain_text', 
          content: '如果这个按钮能点击，说明事件订阅正常' 
        }
      },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '紧急测试' },
            type: 'danger',
            action_type: 'request',
            value: {
              action: 'ping',
              emergency: true,
              timestamp: Date.now()
            }
          }
        ]
      }
    ]
  }
};

const data = JSON.stringify(cardData);

const options = {
  hostname: 'protalk.zeabur.app',
  port: 443,
  path: '/feishu/test/custom-card',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

console.log('🚨 发送紧急诊断按钮...');

const req = https.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(responseData);
      console.log('✅ 紧急按钮发送成功:', response.message);
      console.log('🔍 请点击红色的"紧急测试"按钮，看看是否有反应！');
    } catch (error) {
      console.log('❌ 响应解析失败:', responseData);
    }
  });
});

req.on('error', (e) => {
  console.log('❌ 请求失败:', e.message);
});

req.write(data);
req.end();
