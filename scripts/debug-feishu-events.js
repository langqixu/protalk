#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'https://protalk.zeabur.app';

async function debugFeishuEvents() {
  console.log('🔍 详细调试飞书事件问题...\n');

  try {
    // 1. 检查服务状态
    console.log('1. 检查服务状态');
    const statusResponse = await axios.get(`${BASE_URL}/feishu/status`);
    const status = statusResponse.data.data;
    console.log(`   📊 当前消息计数: ${status.connection.messageCount}`);
    console.log(`   🔗 连接状态: ${status.connection.connected ? '✅ 正常' : '❌ 异常'}`);
    console.log(`   ⏰ 最后心跳: ${new Date(status.connection.lastHeartbeat).toLocaleString('zh-CN')}`);
    console.log(`   ❌ 错误计数: ${status.connection.errorCount}\n`);

    // 2. 测试事件端点
    console.log('2. 测试事件端点');
    const testEvent = {
      type: 'event_callback',
      event: {
        type: 'im.message.receive_v1',
        message: {
          message_id: `debug_test_${Date.now()}`,
          chat_id: 'oc_130c7aece1e0c64c817d4bc764d1b686',
          content: '调试测试消息',
          sender: {
            sender_id: 'debug_user',
            sender_type: 'user'
          }
        }
      }
    };

    const eventResponse = await axios.post(`${BASE_URL}/feishu/events`, testEvent);
    console.log(`   ✅ 事件端点响应: ${JSON.stringify(eventResponse.data)}\n`);

    // 3. 等待处理
    console.log('3. 等待事件处理...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 4. 检查处理后的状态
    console.log('4. 检查处理后的状态');
    const newStatusResponse = await axios.get(`${BASE_URL}/feishu/status`);
    const newStatus = newStatusResponse.data.data;
    console.log(`   📊 新的消息计数: ${newStatus.connection.messageCount}`);
    console.log(`   📈 消息计数变化: ${newStatus.connection.messageCount - status.connection.messageCount}`);
    console.log(`   ❌ 错误计数变化: ${newStatus.connection.errorCount - status.connection.errorCount}\n`);

    // 5. 测试健康检查
    console.log('5. 测试健康检查');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log(`   ✅ 健康检查: ${JSON.stringify(healthResponse.data)}\n`);

    // 6. 测试群信息查询
    console.log('6. 测试群信息查询');
    try {
      const chatInfoResponse = await axios.get(`${BASE_URL}/feishu/chat-info?chat_id=oc_130c7aece1e0c64c817d4bc764d1b686`);
      console.log(`   ✅ 群信息查询: ${JSON.stringify(chatInfoResponse.data)}\n`);
    } catch (error) {
      console.log(`   ❌ 群信息查询失败: ${error.message}\n`);
    }

    // 7. 总结
    console.log('7. 问题诊断总结');
    if (newStatus.connection.messageCount > status.connection.messageCount) {
      console.log('   ✅ 事件处理正常 - 消息计数已增加');
      console.log('   💡 可能的问题: 飞书发送的事件格式与我们的测试格式不匹配');
    } else {
      console.log('   ❌ 事件处理异常 - 消息计数未增加');
      console.log('   💡 可能的问题: 事件处理逻辑有错误');
    }

    console.log('\n🔧 建议的调试步骤:');
    console.log('   1. 检查飞书后台事件日志，确认事件是否成功发送');
    console.log('   2. 查看服务日志，了解事件处理的详细过程');
    console.log('   3. 对比飞书发送的真实事件格式与我们的测试格式');

  } catch (error) {
    console.error('❌ 调试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行调试
debugFeishuEvents().catch(console.error);
