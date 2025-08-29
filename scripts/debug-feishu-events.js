#!/usr/bin/env node

/**
 * 调试飞书事件配置的脚本
 */

const http = require('http');

// 测试不同类型的事件格式
const testEvents = [
  {
    name: '卡片交互事件 - v1格式',
    event: {
      type: 'event_callback',
      event: {
        event_type: 'card.action.trigger',
        action: {
          value: {
            action: 'test_debug',
            source: 'debug_script_v1'
          }
        },
        user_id: 'debug_user',
        message_id: 'debug_message'
      }
    }
  },
  {
    name: '卡片交互事件 - v2格式',
    event: {
      type: 'event_callback',
      event: {
        event_type: 'card.action.trigger_v1',
        action: {
          value: {
            action: 'test_debug',
            source: 'debug_script_v2'
          }
        },
        user_id: 'debug_user',
        message_id: 'debug_message'
      }
    }
  },
  {
    name: '表单提交事件',
    event: {
      type: 'event_callback',
      event: {
        event_type: 'card.form.submit',
        action: {
          value: {
            action: 'test_debug',
            source: 'debug_script_form'
          }
        },
        form_value: {
          reply_content: 'debug_test_content'
        },
        user_id: 'debug_user',
        message_id: 'debug_message'
      }
    }
  }
];

async function sendTestEvent(testCase) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(testCase.event);
    
    console.log(`\n📤 测试: ${testCase.name}`);
    console.log(`   事件类型: ${testCase.event.event?.event_type}`);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/feishu/events',
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
        console.log(`   响应 (${res.statusCode}): ${responseData}`);
        resolve({ status: res.statusCode, data: responseData });
      });
    });

    req.on('error', (e) => {
      console.error(`   ❌ 请求失败: ${e.message}`);
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

async function runEventTests() {
  console.log('🔍 开始调试飞书事件配置...\n');
  
  for (const testCase of testEvents) {
    try {
      await sendTestEvent(testCase);
      // 等待1秒钟，让日志有时间写入
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`测试失败: ${error.message}`);
    }
  }
  
  console.log('\n✅ 事件测试完成');
  console.log('📋 请检查服务器日志，看哪种事件格式被正确处理');
  console.log('💡 提示：查看 logs/combined.log 中的 RAW EVENT 或 收到卡片交互事件 日志');
}

runEventTests().catch(console.error);
