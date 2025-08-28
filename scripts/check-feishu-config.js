#!/usr/bin/env node

const axios = require('axios');

async function checkFeishuConfig() {
  console.log('🔍 检查飞书配置状态...\n');

  try {
    // 1. 检查本地服务状态
    console.log('1. 检查本地服务状态');
    const health = await axios.get('http://localhost:3000/api/health');
    console.log(`   ✅ 本地服务: ${health.data.data.status}\n`);

    // 2. 检查飞书服务状态
    console.log('2. 检查飞书服务状态');
    const status = await axios.get('http://localhost:3000/feishu/status');
    const feishuStatus = status.data.data;
    console.log(`   ✅ 连接模式: ${feishuStatus.mode.currentMode}`);
    console.log(`   ✅ 连接状态: ${feishuStatus.connection.connected ? '已连接' : '未连接'}`);
    console.log(`   ✅ 消息计数: ${feishuStatus.connection.messageCount}`);
    console.log(`   ✅ 最后心跳: ${new Date(feishuStatus.connection.lastHeartbeat).toLocaleString('zh-CN')}\n`);

    // 3. 检查ngrok状态
    console.log('3. 检查ngrok状态');
    const ngrokResponse = await axios.get('http://localhost:4040/api/tunnels');
    const tunnel = ngrokResponse.data.tunnels[0];
    console.log(`   ✅ 公网地址: ${tunnel.public_url}`);
    console.log(`   ✅ 本地地址: ${tunnel.config.addr}`);
    console.log(`   ✅ 连接数: ${tunnel.metrics.conns.count}\n`);

    // 4. 测试公网端点
    console.log('4. 测试公网端点');
    const publicTest = await axios.post(`${tunnel.public_url}/feishu/events`, {
      type: 'url_verification',
      challenge: 'config_test_123'
    });
    console.log(`   ✅ 公网端点响应: ${JSON.stringify(publicTest.data)}\n`);

    // 5. 生成配置建议
    console.log('📋 飞书开发者后台配置建议:');
    console.log('='.repeat(50));
    console.log(`   请求网址: ${tunnel.public_url}/feishu/events`);
    console.log('   验证令牌: 你的验证令牌');
    console.log('   加密密钥: 你的加密密钥');
    console.log('');
    console.log('   订阅事件:');
    console.log('   - im.message.receive_v1 (接收消息)');
    console.log('   - im.message.reaction.created_v1 (消息回应)');
    console.log('   - contact.user.created_v3 (用户创建)');
    console.log('   - contact.user.updated_v3 (用户更新)');
    console.log('');
    console.log('🔧 故障排除步骤:');
    console.log('1. 登录飞书开发者后台: https://open.feishu.cn/app');
    console.log('2. 选择你的应用');
    console.log('3. 进入"事件订阅"页面');
    console.log(`4. 将"请求网址"更新为: ${tunnel.public_url}/feishu/events`);
    console.log('5. 点击"保存"按钮');
    console.log('6. 点击"验证"按钮测试连接');
    console.log('7. 确保订阅了必要的事件类型');
    console.log('8. 发布应用版本');
    console.log('');
    console.log('🧪 测试步骤:');
    console.log('1. 在飞书群组中发送消息');
    console.log('2. 检查机器人是否响应');
    console.log('3. 查看消息计数是否增加');

  } catch (error) {
    console.error('❌ 配置检查失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

checkFeishuConfig().catch(console.error);
