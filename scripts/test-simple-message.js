#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'https://protalk.zeabur.app';

async function testSimpleMessage() {
  console.log('🧪 简单消息发送测试\n');

  try {
    // 1. 发送简单消息
    console.log('1. 发送简单消息到飞书...');
    const testMessage = `✨ 简单测试消息 - ${new Date().toLocaleString('zh-CN')}`;
    
    const response = await axios.post(`${BASE_URL}/feishu/send-message`, {
      content: testMessage
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ API响应:', response.data);
    
    // 2. 也测试使用指定chat_id的发送
    console.log('\n2. 使用指定chat_id发送消息...');
    const chatId = 'oc_130c7aece1e0c64c817d4bc764d1b686';
    const specificMessage = `🎯 指定chat_id测试消息 - ${new Date().toLocaleString('zh-CN')}`;
    
    const response2 = await axios.post(`${BASE_URL}/feishu/send-to`, {
      chat_id: chatId,
      content: specificMessage
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ 指定chat_id响应:', response2.data);

    console.log('\n🎉 测试完成！');
    console.log('💡 请检查飞书群组是否收到了以下消息：');
    console.log('   1.', testMessage);
    console.log('   2.', specificMessage);

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应错误:', error.response.data);
    }
  }
}

// 运行测试
testSimpleMessage().catch(console.error);
