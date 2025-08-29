#!/usr/bin/env node

/**
 * 诊断飞书Webhook配置的脚本
 */

const https = require('https');

console.log('🔍 飞书应用事件订阅配置诊断\n');

console.log('📋 请确认以下配置：\n');

console.log('1. 🌐 **事件订阅回调URL**');
console.log('   https://protalk.zeabur.app/feishu/events');
console.log('   ❗ 确保这个URL在飞书开放平台的"事件订阅"中正确配置\n');

console.log('2. 📡 **需要订阅的事件类型**');
console.log('   ✅ card.action.trigger    - 卡片按钮点击事件');
console.log('   ✅ card.form.submit       - 表单提交事件');
console.log('   ✅ im.message.receive_v1  - 接收消息事件（可选）\n');

console.log('3. 🔑 **权限范围**');
console.log('   ✅ im:message            - 接收消息');
console.log('   ✅ im:message:send_as_bot - 发送消息');
console.log('   ✅ im:chat               - 群组信息\n');

console.log('4. 🤖 **应用状态**');
console.log('   ✅ 应用已发布且启用');
console.log('   ✅ 应用已添加到测试群组');
console.log('   ✅ 机器人有发送消息的权限\n');

// 测试Webhook端点
console.log('🧪 测试 Webhook 端点连接性...\n');

function testWebhookEndpoint() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      type: 'url_verification',
      challenge: 'diagnostic_test_challenge'
    });

    const options = {
      hostname: 'protalk.zeabur.app',
      port: 443,
      path: '/feishu/events',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    console.log('📤 发送URL验证请求...');

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          if (response.challenge === 'diagnostic_test_challenge') {
            console.log('✅ Webhook端点工作正常 - URL验证成功');
            resolve(true);
          } else {
            console.log('❌ Webhook端点响应异常:', responseData);
            resolve(false);
          }
        } catch (error) {
          console.log('❌ Webhook端点响应格式错误:', responseData);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.log('❌ Webhook端点连接失败:', e.message);
      resolve(false);
    });

    req.write(data);
    req.end();
  });
}

async function runDiagnostic() {
  const webhookWorking = await testWebhookEndpoint();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 诊断结果总结');
  console.log('='.repeat(60));
  
  if (webhookWorking) {
    console.log('✅ Webhook端点正常工作');
    console.log('');
    console.log('🔍 按钮点击没有反应的可能原因：');
    console.log('   1. 飞书开放平台的事件订阅中没有配置回调URL');
    console.log('   2. 没有订阅 card.action.trigger 或 card.form.submit 事件');
    console.log('   3. 应用没有正确发布或启用');
    console.log('   4. 应用没有相应的权限');
    console.log('');
    console.log('📱 **下一步操作**：');
    console.log('   1. 登录飞书开放平台：https://open.feishu.cn/');
    console.log('   2. 进入您的应用 → 事件订阅');
    console.log('   3. 确认回调URL：https://protalk.zeabur.app/feishu/events');
    console.log('   4. 确认已订阅：card.action.trigger 和 card.form.submit');
    console.log('   5. 保存配置并重新测试');
  } else {
    console.log('❌ Webhook端点有问题');
    console.log('   请检查 Zeabur 部署状态和网络连接');
  }
  
  console.log('');
  console.log('💡 **配置完成后**，请重新点击测试按钮验证功能');
}

runDiagnostic().catch(console.error);
