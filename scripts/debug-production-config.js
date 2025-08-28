#!/usr/bin/env node

const axios = require('axios');

async function debugProductionConfig() {
  console.log('🔍 生产环境配置调试\n');

  try {
    // 1. 检查生产环境的群组获取
    console.log('1. 检查生产环境群组列表...');
    const chatListResponse = await axios.get('https://protalk.zeabur.app/feishu/chat-list');
    console.log('   生产环境群组:', chatListResponse.data);

    // 2. 检查生产环境能否获取第一个群组ID
    console.log('\n2. 检查生产环境第一个群组ID...');
    const firstChatResponse = await axios.get('https://protalk.zeabur.app/feishu/first-chat-id');
    console.log('   第一个群组ID:', firstChatResponse.data);

    // 3. 尝试直接向已知的chat_id发送消息
    console.log('\n3. 直接向已知chat_id发送测试消息...');
    const knownChatId = 'oc_130c7aece1e0c64c817d4bc764d1b686';
    const testMessage = `🔧 生产环境直接发送测试 - ${new Date().toLocaleString('zh-CN')}`;
    
    const directSendResponse = await axios.post('https://protalk.zeabur.app/feishu/send-to', {
      chat_id: knownChatId,
      content: testMessage
    });
    console.log('   直接发送响应:', directSendResponse.data);

    // 4. 检查生产环境状态
    console.log('\n4. 检查生产环境服务状态...');
    const statusResponse = await axios.get('https://protalk.zeabur.app/feishu/status');
    console.log('   服务状态:', JSON.stringify(statusResponse.data, null, 2));

    console.log('\n📋 诊断总结:');
    console.log('   - 本地可以获取群组:', '✅ 是 (1个群组)');
    console.log('   - 生产环境可以获取群组:', chatListResponse.data.data.count > 0 ? '✅ 是' : '❌ 否');
    console.log('   - 配置可能不同步:', chatListResponse.data.data.count === 0 ? '⚠️  是' : '✅ 否');

  } catch (error) {
    console.error('❌ 调试失败:', error.message);
    if (error.response) {
      console.error('错误响应:', error.response.data);
    }
  }
}

// 运行调试
debugProductionConfig().catch(console.error);
