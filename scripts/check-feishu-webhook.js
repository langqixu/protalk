#!/usr/bin/env node

/**
 * 检查飞书webhook和事件订阅配置
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
        'User-Agent': 'protalk-webhook-check/1.0'
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

async function checkWebhookConfig() {
  try {
    console.log('🔍 检查飞书事件配置...\n');
    
    // 1. 检查服务状态
    const status = await makeRequest('/feishu/status');
    console.log('📊 服务状态:', {
      messageCount: status.status?.messageCount,
      mode: status.status?.mode,
      uptime: Math.round(status.status?.uptime / 60) + 'min'
    });
    
    // 2. 发送测试事件验证URL可达性
    console.log('\n🧪 测试事件端点可达性...');
    const testEvent = {
      type: 'url_verification',
      challenge: 'test_challenge_' + Date.now()
    };
    
    const verifyResult = await makeRequest('/feishu/events', 'POST', testEvent);
    console.log('🎯 URL验证测试:', verifyResult);
    
    console.log('\n📋 需要在飞书开发者后台检查的配置:');
    console.log('1. 事件订阅 URL: https://protalk.zeabur.app/feishu/events');
    console.log('2. 必需的事件类型:');
    console.log('   - card.action.trigger (卡片按钮点击)');
    console.log('   - card.form.submit (表单提交)');
    console.log('3. 应用权限:');
    console.log('   - 机器人 > 发送消息');
    console.log('   - 机器人 > 读取消息');
    console.log('   - 机器人 > 发送互动卡片');
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

checkWebhookConfig().then(() => {
  console.log('\n🎉 检查完成');
  process.exit(0);
}).catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
