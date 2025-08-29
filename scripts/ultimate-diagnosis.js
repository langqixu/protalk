#!/usr/bin/env node

/**
 * 终极诊断：深度分析飞书按钮交互问题
 * 从卡片格式、API版本、消息发送参数等多个角度排查
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
        'User-Agent': 'protalk-ultimate-diagnosis/1.0'
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

async function ultimateDiagnosis() {
  try {
    console.log('🔬 终极诊断开始...\n');
    
    console.log('📋 问题总结:');
    console.log('1. 服务器事件处理正常 ✅');
    console.log('2. URL可达性正常 ✅');
    console.log('3. 事件订阅已配置 ✅');
    console.log('4. 应用已发布 ✅');
    console.log('5. 权限已开启 ✅');
    console.log('6. 新旧版事件都已订阅 ✅');
    console.log('7. 飞书仍不发送点击事件 ❌\n');
    
    console.log('🎯 可能的隐藏问题:');
    console.log('');
    
    console.log('1️⃣ 消息发送API参数问题');
    console.log('   - 缺少 update_multi: true 参数');
    console.log('   - 群聊和私聊的卡片处理不同');
    console.log('   - 消息类型可能不正确');
    console.log('');
    
    console.log('2️⃣ 卡片格式兼容性问题');
    console.log('   - V1 API 发送 V2 卡片格式可能不兼容');
    console.log('   - 缺少必要的 config 或 header');
    console.log('   - elements 结构可能有问题');
    console.log('');
    
    console.log('3️⃣ 飞书环境和权限问题');
    console.log('   - 企业版 vs 个人版飞书的差异');
    console.log('   - 机器人可能没有正确添加到群组');
    console.log('   - 可能需要机器人主动发起会话');
    console.log('');
    
    console.log('4️⃣ API 版本兼容性问题');
    console.log('   - 使用 FeishuBotV1 但期望 V2 卡片行为');
    console.log('   - 可能需要切换到纯 V2 API');
    console.log('   - 事件回调地址可能需要特定格式');
    console.log('');
    
    console.log('🔧 建议的解决方案:');
    console.log('');
    
    console.log('方案1: 检查消息发送API');
    console.log('   - 确保使用 msg_type: "interactive"');
    console.log('   - 添加 update_multi: true');
    console.log('   - 检查 receive_id_type 是否正确');
    console.log('');
    
    console.log('方案2: 简化卡片格式');
    console.log('   - 移除复杂的 header 和 config');
    console.log('   - 使用最基础的 elements 结构');
    console.log('   - 确保按钮的 value 结构简单');
    console.log('');
    
    console.log('方案3: 尝试不同的测试环境');
    console.log('   - 在私聊中测试机器人');
    console.log('   - 确认机器人在群组中的权限');
    console.log('   - 检查是否需要@机器人');
    console.log('');
    
    console.log('方案4: 使用飞书官方调试工具');
    console.log('   - 在开发者后台使用"调试"功能');
    console.log('   - 手动发送测试事件到我们的URL');
    console.log('   - 检查事件是否能正常发送');
    console.log('');
    
    // 测试最简单的事件格式
    console.log('🧪 正在测试最简事件格式...');
    const minimumEvent = {
      type: 'event_callback',
      event: {
        event_type: 'card.action.trigger',
        user_id: 'test',
        message_id: 'test_msg',
        action: { value: { test: 'ping' } }
      }
    };
    
    const result = await makeRequest('/feishu/events', 'POST', minimumEvent);
    console.log('最简事件测试结果:', result);
    
    console.log('\n💡 强烈建议:');
    console.log('1. 在飞书开发者后台使用"调试"功能手动发送事件');
    console.log('2. 检查机器人是否真的在目标群组中有权限');
    console.log('3. 尝试在私聊中测试按钮交互');
    console.log('4. 考虑创建一个全新的测试应用');
    
  } catch (error) {
    console.error('❌ 诊断失败:', error.message);
  }
}

ultimateDiagnosis().then(() => {
  console.log('\n🎉 终极诊断完成');
  process.exit(0);
}).catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
