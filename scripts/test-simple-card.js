#!/usr/bin/env node

const axios = require('axios');

async function testSimpleCard() {
  console.log('🔍 测试简单卡片消息...\n');

  try {
    // 1. 测试获取群组ID
    console.log('1. 获取群组ID');
    const chatIdResponse = await axios.get('http://localhost:3000/feishu/first-chat-id');
    const chatId = chatIdResponse.data.data.chatId;
    console.log(`   ✅ 群组ID: ${chatId}\n`);

    // 2. 测试发送最简单的卡片消息
    console.log('2. 测试发送最简单的卡片消息');
    const simpleCard = {
      config: {
        wide_screen_mode: true
      },
      header: {
        title: {
          tag: 'plain_text',
          content: '测试卡片'
        },
        template: 'blue'
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: '这是一个测试卡片'
          }
        }
      ]
    };

    const cardResult = await axios.post('http://localhost:3000/feishu/send-card', {
      cardData: simpleCard
    });
    console.log(`   ✅ 卡片消息结果: ${JSON.stringify(cardResult.data)}\n`);

    console.log('✅ 简单卡片测试完成！');

  } catch (error) {
    console.error('❌ 简单卡片测试失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

testSimpleCard().catch(console.error);
