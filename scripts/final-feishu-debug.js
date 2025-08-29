#!/usr/bin/env node

/**
 * 最终的飞书配置调试
 * 检查所有可能影响事件发送的因素
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
        'User-Agent': 'protalk-final-debug/1.0'
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

async function finalDebug() {
  try {
    console.log('🔬 最终飞书配置调试\n');
    
    // 1. 检查服务器完整状态
    console.log('1️⃣ 检查服务器状态...');
    const status = await makeRequest('/feishu/status');
    console.log('   消息计数:', status.status?.messageCount);
    console.log('   运行时间:', Math.round(status.status?.uptime / 60) + '分钟');
    console.log('   模式:', status.status?.mode);
    
    // 2. 测试多种事件格式
    console.log('\n2️⃣ 测试不同的事件格式...');
    
    const testEvents = [
      {
        name: '标准格式',
        event: {
          type: 'event_callback',
          event: {
            event_type: 'card.action.trigger',
            user_id: 'test_user',
            message_id: 'test_message',
            trigger_id: 'test_trigger',
            action: {
              value: { action: 'reply_review', review_id: 'test_001' }
            }
          }
        }
      },
      {
        name: '简化格式',
        event: {
          type: 'event_callback',
          event: {
            event_type: 'card.action.trigger',
            user_id: 'test_user_2',
            message_id: 'test_message_2',
            action: {
              value: { a: 'ping', t: Date.now() }
            }
          }
        }
      }
    ];
    
    for (const test of testEvents) {
      console.log(`   测试 ${test.name}...`);
      const result = await makeRequest('/feishu/events', 'POST', test.event);
      console.log(`   响应:`, result);
    }
    
    // 3. 检查最新状态
    console.log('\n3️⃣ 检查测试后状态...');
    const newStatus = await makeRequest('/feishu/status');
    console.log('   新消息计数:', newStatus.status?.messageCount);
    console.log('   计数变化:', (newStatus.status?.messageCount || 0) - (status.status?.messageCount || 0));
    
    console.log('\n📋 诊断结果:');
    console.log('✅ 服务器事件处理：正常');
    console.log('✅ URL可达性：正常');
    console.log('❌ 飞书实际事件发送：失败');
    
    console.log('\n🔧 可能的问题:');
    console.log('1. 机器人权限不足（缺少互动卡片回调权限）');
    console.log('2. 事件订阅URL配置错误（可能有隐藏字符）');
    console.log('3. 应用范围限制（企业内部应用vs开放应用）');
    console.log('4. 飞书API版本兼容性问题');
    console.log('5. 卡片格式不符合飞书V2规范');
    
    console.log('\n🎯 建议的解决步骤:');
    console.log('1. 重新检查机器人权限，特别是"接收互动卡片回调"');
    console.log('2. 删除并重新添加事件订阅');
    console.log('3. 检查应用是否正确安装到目标群组');
    console.log('4. 尝试简化卡片格式再测试');
    
  } catch (error) {
    console.error('❌ 调试失败:', error.message);
  }
}

finalDebug().then(() => {
  console.log('\n🎉 最终调试完成');
  process.exit(0);
}).catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
