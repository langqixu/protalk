#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'https://protalk.zeabur.app';

async function testRealFeishuEvent() {
  console.log('🔍 测试真实飞书事件格式...\n');

  try {
    // 1. 检查当前消息计数
    console.log('1. 检查当前消息计数');
    const statusResponse = await axios.get(`${BASE_URL}/feishu/status`);
    const currentMessageCount = statusResponse.data.data.connection.messageCount;
    console.log(`   📊 当前消息计数: ${currentMessageCount}\n`);

    // 2. 模拟真实的飞书事件格式
    console.log('2. 发送真实格式的飞书事件');
    const realEvent = {
      type: 'event_callback',
      event: {
        type: 'im.message.receive_v1',
        message: {
          message_id: `real_test_${Date.now()}`,
          chat_id: 'oc_130c7aece1e0c64c817d4bc764d1b686',
          content: '这是一条真实格式的测试消息',
          sender: {
            sender_id: 'test_user_001',
            sender_type: 'user'
          },
          create_time: new Date().toISOString()
        }
      }
    };

    console.log('   📤 发送事件内容:', JSON.stringify(realEvent, null, 2));
    
    const eventResponse = await axios.post(`${BASE_URL}/feishu/events`, realEvent);
    console.log(`   ✅ 事件发送响应: ${JSON.stringify(eventResponse.data)}\n`);

    // 3. 等待处理
    console.log('3. 等待事件处理...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 4. 检查处理后的消息计数
    console.log('4. 检查处理后的消息计数');
    const newStatusResponse = await axios.get(`${BASE_URL}/feishu/status`);
    const newMessageCount = newStatusResponse.data.data.connection.messageCount;
    console.log(`   📊 新的消息计数: ${newMessageCount}`);
    console.log(`   📈 消息计数变化: ${newMessageCount - currentMessageCount}\n`);

    if (newMessageCount > currentMessageCount) {
      console.log('✅ 事件处理成功！消息计数已增加');
    } else {
      console.log('❌ 事件处理失败！消息计数未增加');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testRealFeishuEvent().catch(console.error);
