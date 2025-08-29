#!/usr/bin/env node

/**
 * 手动发送测试事件来验证服务器事件处理
 */

const https = require('https');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'protalk.zeabur.app',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'protalk-manual-test/1.0'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (e) {
          resolve({ raw: responseData, status: res.statusCode });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testManualEvent() {
  try {
    console.log('🧪 手动发送按钮点击事件测试...\n');
    
    // 模拟飞书发送的按钮点击事件
    const mockButtonEvent = {
      type: 'event_callback',
      event: {
        event_type: 'card.action.trigger',
        user_id: 'test_user_123',
        message_id: 'test_msg_456',
        trigger_id: 'test_trigger_789',
        action: {
          value: {
            action: 'reply_review',
            review_id: 'test_review_001',
            app_name: 'Test App',
            author: 'Test User'
          }
        }
      }
    };
    
    console.log('📤 发送模拟事件:', JSON.stringify(mockButtonEvent, null, 2));
    
    const result = await makeRequest('/feishu/events', 'POST', mockButtonEvent);
    console.log('\n📥 服务器响应:', result);
    
    // 检查消息计数是否增加
    console.log('\n🔍 检查服务器状态变化...');
    const status = await makeRequest('/feishu/status');
    console.log('📊 当前状态:', {
      messageCount: status.status?.messageCount,
      uptime: Math.round(status.status?.uptime / 60) + 'min'
    });
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testManualEvent().then(() => {
  console.log('\n🎉 手动事件测试完成');
  process.exit(0);
}).catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
