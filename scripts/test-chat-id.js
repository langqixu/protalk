#!/usr/bin/env node

const axios = require('axios');

async function testChatId() {
  console.log('🔍 测试FeishuBot chat_id获取功能...\n');

  try {
    // 1. 测试飞书服务状态
    console.log('1. 检查飞书服务状态');
    const status = await axios.get('http://localhost:3000/feishu/status');
    console.log(`   ✅ 连接状态: ${status.data.data.connection.connected ? '已连接' : '未连接'}\n`);

    // 2. 测试获取群组列表
    console.log('2. 测试获取群组列表');
    const chatList = await axios.get('http://localhost:3000/feishu/chat-list');
    console.log(`   ✅ 群组列表: ${JSON.stringify(chatList.data)}\n`);

    // 3. 测试获取第一个群组ID
    console.log('3. 测试获取第一个群组ID');
    const firstChatId = await axios.get('http://localhost:3000/feishu/first-chat-id');
    console.log(`   ✅ 第一个群组ID: ${JSON.stringify(firstChatId.data)}\n`);

    // 4. 测试发送简单消息
    console.log('4. 测试发送简单消息');
    const messageResult = await axios.post('http://localhost:3000/feishu/send-message', {
      content: '🧪 测试消息 - ' + new Date().toLocaleString('zh-CN')
    });
    console.log(`   ✅ 消息发送结果: ${JSON.stringify(messageResult.data)}\n`);

    console.log('✅ 所有测试通过！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

testChatId().catch(console.error);
