#!/usr/bin/env node

const axios = require('axios');

async function testDirectFeishu() {
  console.log('🔍 直接测试FeishuBot方法...\n');

  try {
    // 1. 测试获取群组ID
    console.log('1. 获取群组ID');
    const chatIdResponse = await axios.get('http://localhost:3000/feishu/first-chat-id');
    const chatId = chatIdResponse.data.data.chatId;
    console.log(`   ✅ 群组ID: ${chatId}\n`);

    // 2. 测试发送简单文本消息
    console.log('2. 测试发送简单文本消息');
    const textMessage = await axios.post('http://localhost:3000/feishu/send-message', {
      content: '🧪 直接测试消息 - ' + new Date().toLocaleString('zh-CN')
    });
    console.log(`   ✅ 文本消息结果: ${JSON.stringify(textMessage.data)}\n`);

    // 3. 测试发送简单评论推送
    console.log('3. 测试发送简单评论推送');
    const simpleReview = {
      review: {
        id: 'direct_test_001',
        appId: '1077776989',
        rating: 5,
        title: '直接测试评论',
        body: '这是一个直接测试的评论，用于验证推送功能。',
        nickname: '测试用户',
        createdDate: new Date(),
        isEdited: false
      },
      type: 'new'
    };

    const reviewResult = await axios.post('http://localhost:3000/feishu/test', simpleReview);
    console.log(`   ✅ 评论推送结果: ${JSON.stringify(reviewResult.data)}\n`);

    console.log('✅ 所有直接测试通过！');

  } catch (error) {
    console.error('❌ 直接测试失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

testDirectFeishu().catch(console.error);
