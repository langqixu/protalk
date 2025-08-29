#!/usr/bin/env node

/**
 * 测试最小卡片结构
 */

const https = require('https');

// 创建最基本的卡片（无表单）
const minimalCard = {
  config: { wide_screen_mode: true },
  header: {
    title: { tag: 'plain_text', content: '🧪 最小测试卡片' },
    template: 'blue'
  },
  elements: [
    {
      tag: 'div',
      text: { tag: 'lark_md', content: '**测试内容**\n这是一个最简单的卡片，没有表单和按钮。' }
    },
    {
      tag: 'action',
      actions: [
        {
          tag: 'button',
          text: { tag: 'plain_text', content: '测试按钮' },
          type: 'primary',
          action_type: 'request',
          value: { action: 'test_click' }
        }
      ],
      layout: 'flow'
    }
  ]
};

// 发送测试卡片
function sendTestCard() {
  const data = JSON.stringify({
    cardData: minimalCard
  });

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
      console.log('状态码:', res.statusCode);
      console.log('响应:', responseData);
    });
  });

  req.on('error', (e) => {
    console.error('请求失败:', e);
  });

  req.write(data);
  req.end();
}

console.log('🧪 发送最小测试卡片...');
console.log('卡片结构:', JSON.stringify(minimalCard, null, 2));
sendTestCard();
