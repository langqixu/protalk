#!/usr/bin/env node

const axios = require('axios');

async function debugRequestData() {
  console.log('🔍 调试请求数据...\n');

  try {
    // 1. 测试获取群组ID
    console.log('1. 获取群组ID');
    const chatIdResponse = await axios.get('http://localhost:3000/feishu/first-chat-id');
    const chatId = chatIdResponse.data.data.chatId;
    console.log(`   ✅ 群组ID: ${chatId}\n`);

    // 2. 测试发送文本消息（这个应该成功）
    console.log('2. 测试发送文本消息');
    const textResult = await axios.post('http://localhost:3000/feishu/send-message', {
      content: '测试文本消息'
    });
    console.log(`   ✅ 文本消息结果: ${JSON.stringify(textResult.data)}\n`);

    // 3. 测试发送最简单的卡片
    console.log('3. 测试发送最简单的卡片');
    const minimalCard = {
      config: {
        wide_screen_mode: true
      },
      header: {
        title: {
          tag: 'plain_text',
          content: '测试'
        }
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: '测试内容'
          }
        }
      ]
    };

    const cardResult = await axios.post('http://localhost:3000/feishu/send-card', {
      cardData: minimalCard
    });
    console.log(`   ✅ 卡片结果: ${JSON.stringify(cardResult.data)}\n`);

    console.log('✅ 调试完成！');

  } catch (error) {
    console.error('❌ 调试失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

debugRequestData().catch(console.error);
