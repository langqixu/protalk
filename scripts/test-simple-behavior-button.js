#!/usr/bin/env node

/**
 * 测试简单的behaviors按钮，查看事件结构
 */

const http = require('http');

function createSimpleBehaviorCard() {
  return {
    config: { 
      wide_screen_mode: true,
      update_multi: true 
    },
    header: {
      title: { tag: 'plain_text', content: '🧪 Behaviors 按钮测试' },
      template: 'blue'
    },
    elements: [
      {
        tag: 'div',
        text: { tag: 'lark_md', content: '**测试目标**：验证 behaviors 按钮事件结构' }
      },
      { tag: 'hr' },
      {
        tag: 'button',
        text: { tag: 'plain_text', content: '点击测试 Behaviors' },
        type: 'primary',
        behaviors: [
          {
            type: 'callback',
            value: {
              action: 'test_behaviors',
              test_id: 'behavior_test_001',
              timestamp: Date.now()
            }
          }
        ]
      }
    ]
  };
}

function sendBehaviorCard() {
  return new Promise((resolve, reject) => {
    const cardData = createSimpleBehaviorCard();
    const data = JSON.stringify({ cardData });

    console.log('🧪 发送 behaviors 按钮测试卡片:');
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

sendBehaviorCard().then(() => {
  console.log('\n🎉 behaviors 按钮测试卡片发送完成');
  console.log('📋 请点击按钮，然后检查服务器日志中的事件结构');
  console.log('🔍 重点查看：');
  console.log('   1. 事件类型 (event_type)');
  console.log('   2. action 字段结构');
  console.log('   3. behaviors 数据是否正确传递');
}).catch(error => {
  console.error('❌ 测试失败:', error);
});
