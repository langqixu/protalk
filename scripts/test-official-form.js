#!/usr/bin/env node

/**
 * 测试完全按照飞书官方规范的表单提交
 */

const https = require('https');

// 按照飞书官方文档的标准格式
const cardData = {
  cardData: {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: '📋 官方规范表单测试' },
      template: 'blue'
    },
    elements: [
      {
        tag: 'div',
        text: { 
          tag: 'plain_text', 
          content: '测试完全按照飞书官方规范的表单提交功能' 
        }
      },
      {
        tag: 'form',
        name: 'test_form',
        elements: [
          {
            tag: 'input',
            name: 'reply_content',
            placeholder: { tag: 'plain_text', content: '请输入回复内容...' },
            default_value: '',
            required: true
          },
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '官方规范提交' },
            type: 'primary',
            form_action_type: 'submit',
            value: {
              action: 'official_form_submit',
              test_type: 'official_spec'
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

console.log('📋 发送官方规范表单卡片...');

const req = https.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(responseData);
      console.log('✅ 官方规范表单发送成功:', response.message);
      console.log('🔍 请测试这个按照官方规范的表单提交！');
      console.log('💡 如果这个也不工作，说明问题在其他地方');
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
