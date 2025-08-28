#!/usr/bin/env node

const axios = require('axios');

async function debugFeishuRequest() {
  console.log('🔍 调试飞书API请求...\n');

  try {
    // 1. 测试获取访问令牌
    console.log('1. 测试获取访问令牌');
    const tokenResponse = await axios.get('http://localhost:3000/feishu/status');
    console.log(`   ✅ 服务状态: ${tokenResponse.data.data.connection.connected ? '已连接' : '未连接'}\n`);

    // 2. 测试获取群组ID
    console.log('2. 获取群组ID');
    const chatIdResponse = await axios.get('http://localhost:3000/feishu/first-chat-id');
    const chatId = chatIdResponse.data.data.chatId;
    console.log(`   ✅ 群组ID: ${chatId}\n`);

    // 3. 测试发送最简单的文本消息
    console.log('3. 测试发送最简单的文本消息');
    const simpleText = await axios.post('http://localhost:3000/feishu/send-message', {
      content: '测试消息'
    });
    console.log(`   ✅ 简单文本消息结果: ${JSON.stringify(simpleText.data)}\n`);

    // 4. 测试发送一个非常简单的评论（不包含复杂内容）
    console.log('4. 测试发送简单评论');
    const simpleReview = {
      review: {
        id: 'debug_test_001',
        appId: '1077776989',
        rating: 5,
        title: '测试',
        body: '测试评论',
        nickname: '测试用户',
        createdDate: new Date(),
        isEdited: false
      },
      type: 'new'
    };

    const reviewResult = await axios.post('http://localhost:3000/feishu/test', simpleReview);
    console.log(`   ✅ 简单评论结果: ${JSON.stringify(reviewResult.data)}\n`);

    console.log('✅ 调试测试完成！');

  } catch (error) {
    console.error('❌ 调试测试失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

debugFeishuRequest().catch(console.error);
