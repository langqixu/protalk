#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testDirectCard() {
  console.log('🎴 直接测试卡片消息发送...\n');

  try {
    // 1. 检查服务状态
    console.log('1. 检查服务状态');
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log(`   ✅ 服务状态: ${health.data.data.status}\n`);

    // 2. 测试简单的评论卡片推送
    console.log('2. 测试简单评论卡片推送');
    const testReview = {
      chat_id: 'oc_130c7aece1e0c64c817d4bc764d1b686',
      review: {
        id: 'direct_test_001',
        appId: '1077776989',
        rating: 5,
        title: '直接测试评论',
        body: '这是一个直接测试卡片消息发送的评论。',
        nickname: '直接测试用户',
        createdDate: new Date().toISOString(),
        isEdited: false
      },
      type: 'new'
    };

    const response = await axios.post(`${BASE_URL}/feishu/test`, testReview);
    console.log(`   ✅ 卡片推送响应: ${JSON.stringify(response.data)}\n`);

    // 3. 检查消息计数
    console.log('3. 检查消息计数');
    const status = await axios.get(`${BASE_URL}/feishu/status`);
    console.log(`   📨 消息计数: ${status.data.data.connection.messageCount}\n`);

    console.log('🎉 直接卡片测试完成！');
    console.log('\n📋 测试结果:');
    console.log('✅ 服务状态正常');
    console.log('✅ 卡片消息发送成功');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    console.log('\n🔧 故障排除建议:');
    console.log('1. 检查飞书API配置');
    console.log('2. 查看详细错误日志');
  }
}

// 运行测试
testDirectCard();
