#!/usr/bin/env node

/**
 * 测试按钮交互调试脚本
 * 发送简化的测试卡片来调试按钮问题
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
        'User-Agent': 'protalk-debug/1.0'
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

async function testButtonDebug() {
  try {
    console.log('🔧 测试按钮交互调试...\n');
    
    // 1. 检查服务状态
    const status = await makeRequest('/feishu/status');
    console.log('📊 服务状态:', {
      messageCount: status.status?.messageCount,
      mode: status.status?.mode,
      uptime: Math.round(status.status?.uptime / 60) + 'min'
    });
    
    // 2. 发送一个简化的测试卡片
    console.log('\n🧪 发送测试卡片...');
    const testResult = await makeRequest('/feishu/test/simple-card', 'POST', {
      message: '测试按钮交互',
      buttons: ['回复评论', '报告问题']
    });
    
    console.log('🎯 测试结果:', testResult);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testButtonDebug().then(() => {
  console.log('\n🎉 调试测试完成');
  process.exit(0);
}).catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
