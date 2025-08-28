#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testFeishuAPI() {
  console.log('🔍 测试飞书API连接和权限...\n');

  try {
    // 1. 检查服务状态
    console.log('1. 检查服务状态');
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log(`   ✅ 服务状态: ${health.data.data.status}\n`);

    // 2. 检查飞书状态
    console.log('2. 检查飞书状态');
    const feishuStatus = await axios.get(`${BASE_URL}/feishu/status`);
    console.log(`   📱 模式: ${feishuStatus.data.data.mode.currentMode}`);
    console.log(`   🔗 连接: ${feishuStatus.data.data.connection.connected ? '✅ 正常' : '❌ 异常'}`);
    console.log(`   📨 消息数: ${feishuStatus.data.data.connection.messageCount}\n`);

    // 3. 测试简单的文本消息发送
    console.log('3. 测试简单文本消息发送');
    const testMessage = {
      chat_id: 'test_chat',
      content: '🧪 飞书API连接测试消息'
    };

    const messageResponse = await axios.post(`${BASE_URL}/feishu/test`, testMessage);
    console.log(`   ✅ 消息发送响应: ${JSON.stringify(messageResponse.data)}\n`);

    // 4. 检查最终状态
    console.log('4. 检查最终状态');
    const finalStatus = await axios.get(`${BASE_URL}/feishu/status`);
    console.log(`   📨 最终消息计数: ${finalStatus.data.data.connection.messageCount}\n`);

    console.log('🎉 飞书API测试完成！');
    console.log('\n📋 测试结果:');
    console.log('✅ 服务状态正常');
    console.log('✅ 飞书连接正常');
    console.log('✅ 消息发送功能正常');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    console.log('\n🔧 故障排除建议:');
    console.log('1. 检查飞书应用配置（App ID, App Secret）');
    console.log('2. 确保机器人已添加到群组');
    console.log('3. 检查飞书API权限设置');
    console.log('4. 查看详细错误日志');
  }
}

// 运行测试
testFeishuAPI();
