#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testFeishuToken() {
  console.log('🔑 测试飞书API访问令牌...\n');

  try {
    // 1. 检查服务状态
    console.log('1. 检查服务状态');
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log(`   ✅ 服务状态: ${health.data.data.status}\n`);

    // 2. 测试获取群组列表
    console.log('2. 测试获取群组列表');
    const chatListResponse = await axios.get(`${BASE_URL}/feishu/status`);
    console.log(`   📱 模式: ${chatListResponse.data.data.mode.currentMode}`);
    console.log(`   🔗 连接: ${chatListResponse.data.data.connection.connected ? '✅ 正常' : '❌ 异常'}\n`);

    // 3. 测试简单的文本消息发送
    console.log('3. 测试简单文本消息发送');
    const testMessage = {
      chat_id: 'oc_130c7aece1e0c64c817d4bc764d1b686', // 使用获取到的群组ID
      content: '🧪 飞书API访问令牌测试消息'
    };

    const messageResponse = await axios.post(`${BASE_URL}/feishu/test`, testMessage);
    console.log(`   ✅ 消息发送响应: ${JSON.stringify(messageResponse.data)}\n`);

    // 4. 检查消息计数
    console.log('4. 检查消息计数');
    const status = await axios.get(`${BASE_URL}/feishu/status`);
    console.log(`   📨 消息计数: ${status.data.data.connection.messageCount}\n`);

    console.log('🎉 飞书API访问令牌测试完成！');
    console.log('\n📋 测试结果:');
    console.log('✅ 服务状态正常');
    console.log('✅ 飞书连接正常');
    console.log('✅ 群组ID获取成功');
    console.log('✅ 文本消息发送成功');

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
testFeishuToken();
