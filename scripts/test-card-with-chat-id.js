#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testCardWithChatId() {
  console.log('🎴 测试卡片消息发送...\n');

  // 请在这里输入你的飞书群组ID
  const CHAT_ID = 'oc_xxxxxxxxxxxxxxxxxxxxxxxxxx'; // 请替换为实际的群组ID

  try {
    // 1. 检查服务状态
    console.log('1. 检查服务状态');
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log(`   ✅ 服务状态: ${health.data.data.status}\n`);

    // 2. 发送测试评论卡片
    console.log('2. 发送测试评论卡片');
    const testReview = {
      chat_id: CHAT_ID,
      review: {
        id: 'test_card_001',
        appId: '1077776989',
        rating: 5,
        title: '修复后的卡片测试',
        body: '这是一个测试卡片消息，用于验证修复后的飞书机器人卡片推送功能是否正常工作。',
        nickname: '测试用户',
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

    console.log('🎉 测试完成！');
    console.log('\n📋 下一步:');
    console.log('1. 检查飞书群组是否收到卡片消息');
    console.log('2. 验证卡片显示效果');
    console.log('3. 测试输入框和按钮交互');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    console.log('\n🔧 故障排除:');
    console.log('1. 确保CHAT_ID是正确的群组ID');
    console.log('2. 确保机器人已添加到群组');
    console.log('3. 检查飞书API配置');
  }
}

// 运行测试
testCardWithChatId();
