#!/usr/bin/env node

const axios = require('axios');

async function diagnoseFeishuEvents() {
  console.log('🔍 诊断飞书事件问题...\n');

  try {
    // 1. 检查当前状态
    console.log('1. 检查当前状态');
    const status = await axios.get('http://localhost:3000/feishu/status');
    const feishuStatus = status.data.data;
    console.log(`   ✅ 连接模式: ${feishuStatus.mode.currentMode}`);
    console.log(`   ✅ 连接状态: ${feishuStatus.connection.connected ? '已连接' : '未连接'}`);
    console.log(`   ✅ 消息计数: ${feishuStatus.connection.messageCount}`);
    console.log(`   ✅ 最后心跳: ${new Date(feishuStatus.connection.lastHeartbeat).toLocaleString('zh-CN')}\n`);

    // 2. 检查ngrok状态
    console.log('2. 检查ngrok状态');
    const ngrokResponse = await axios.get('http://localhost:4040/api/tunnels');
    const tunnel = ngrokResponse.data.tunnels[0];
    console.log(`   ✅ 公网地址: ${tunnel.public_url}`);
    console.log(`   ✅ 连接数: ${tunnel.metrics.conns.count}\n`);

    // 3. 测试公网端点
    console.log('3. 测试公网端点');
    const publicTest = await axios.post(`${tunnel.public_url}/feishu/events`, {
      type: 'url_verification',
      challenge: 'diagnose_test_123'
    });
    console.log(`   ✅ 公网端点响应: ${JSON.stringify(publicTest.data)}\n`);

    // 4. 分析问题
    console.log('4. 问题分析');
    console.log('   ❌ 飞书没有向服务器发送事件');
    console.log('   ❌ 消息计数没有增加');
    console.log('   ❌ 日志中没有事件请求\n');

    // 5. 可能的原因
    console.log('5. 可能的原因:');
    console.log('   🔍 飞书事件订阅配置问题');
    console.log('   🔍 机器人权限不足');
    console.log('   🔍 群组配置问题');
    console.log('   🔍 应用未发布或未生效\n');

    // 6. 解决方案
    console.log('6. 解决方案:');
    console.log('   📋 检查飞书开发者后台配置:');
    console.log(`      - 请求网址: ${tunnel.public_url}/feishu/events`);
    console.log('      - 验证令牌: 你的验证令牌');
    console.log('      - 加密密钥: 你的加密密钥');
    console.log('');
    console.log('   📋 检查事件订阅:');
    console.log('      - im.message.receive_v1 (接收消息)');
    console.log('      - im.message.reaction.created_v1 (消息回应)');
    console.log('      - contact.user.created_v3 (用户创建)');
    console.log('      - contact.user.updated_v3 (用户更新)');
    console.log('');
    console.log('   📋 检查机器人权限:');
    console.log('      - 获取群组中用户信息');
    console.log('      - 获取与发送单聊、群组消息');
    console.log('      - 获取用户发给机器人的单聊消息');
    console.log('      - 获取群组中@机器人的消息');
    console.log('');
    console.log('   📋 检查群组配置:');
    console.log('      - 确认机器人已添加到群组');
    console.log('      - 确认机器人有发送消息权限');
    console.log('      - 确认应用已发布并生效');

    // 7. 测试步骤
    console.log('\n7. 测试步骤:');
    console.log('   1. 登录飞书开发者后台: https://open.feishu.cn/app');
    console.log('   2. 选择你的应用');
    console.log('   3. 进入"事件订阅"页面');
    console.log(`   4. 确认"请求网址"是: ${tunnel.public_url}/feishu/events`);
    console.log('   5. 点击"验证"按钮测试连接');
    console.log('   6. 确认订阅了必要的事件类型');
    console.log('   7. 检查"机器人"功能页面权限配置');
    console.log('   8. 确认应用已发布');
    console.log('   9. 在群组中重新发送消息测试');

  } catch (error) {
    console.error('❌ 诊断失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

diagnoseFeishuEvents().catch(console.error);
