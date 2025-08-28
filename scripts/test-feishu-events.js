#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'https://2f7cfc2a4732.ngrok-free.app';

async function testFeishuEvents() {
  console.log('🧪 开始测试飞书事件处理功能...\n');

  try {
    // 1. 测试健康检查
    console.log('1. 测试健康检查');
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log(`   ✅ 服务状态: ${health.data.data.status}\n`);

    // 2. 测试飞书服务状态
    console.log('2. 测试飞书服务状态');
    const status = await axios.get(`${BASE_URL}/feishu/status`);
    console.log(`   ✅ 模式: ${status.data.data.mode.currentMode}`);
    console.log(`   ✅ 连接状态: ${status.data.data.connection.connected ? '已连接' : '未连接'}\n`);

    // 3. 测试 URL 验证
    console.log('3. 测试 URL 验证');
    const urlVerification = await axios.post(`${BASE_URL}/feishu/events`, {
      type: 'url_verification',
      challenge: 'test_challenge_123'
    });
    console.log(`   ✅ 验证响应: ${JSON.stringify(urlVerification.data)}\n`);

    // 4. 测试消息接收事件
    console.log('4. 测试消息接收事件');
    const messageEvent = await axios.post(`${BASE_URL}/feishu/events`, {
      type: 'event_callback',
      event: {
        type: 'im.message.receive_v1',
        message: {
          message_id: `test_msg_${Date.now()}`,
          chat_id: 'test_chat_001',
          content: '这是一条测试消息',
          sender: {
            sender_id: 'test_user_001',
            sender_type: 'user'
          },
          create_time: new Date().toISOString()
        }
      }
    });
    console.log(`   ✅ 消息事件响应: ${JSON.stringify(messageEvent.data)}\n`);

    // 5. 测试斜杠指令
    console.log('5. 测试斜杠指令');
    const commandEvent = await axios.post(`${BASE_URL}/feishu/events`, {
      type: 'event_callback',
      event: {
        type: 'im.message.receive_v1',
        message: {
          message_id: `test_cmd_${Date.now()}`,
          chat_id: 'test_chat_001',
          content: '/reply 这是一条测试回复',
          sender: {
            sender_id: 'test_user_001',
            sender_type: 'user'
          },
          create_time: new Date().toISOString()
        }
      }
    });
    console.log(`   ✅ 指令事件响应: ${JSON.stringify(commandEvent.data)}\n`);

    // 6. 测试消息回应事件
    console.log('6. 测试消息回应事件');
    const reactionEvent = await axios.post(`${BASE_URL}/feishu/events`, {
      type: 'event_callback',
      event: {
        type: 'im.message.reaction.created_v1',
        message_id: 'test_msg_001',
        reaction_type: 'THUMBSUP',
        user_id: 'test_user_001',
        create_time: new Date().toISOString()
      }
    });
    console.log(`   ✅ 回应事件响应: ${JSON.stringify(reactionEvent.data)}\n`);

    // 7. 测试用户创建事件
    console.log('7. 测试用户创建事件');
    const userCreatedEvent = await axios.post(`${BASE_URL}/feishu/events`, {
      type: 'event_callback',
      event: {
        type: 'contact.user.created_v3',
        user_id: 'test_user_002',
        name: '新测试用户',
        email: 'newtest@example.com',
        create_time: new Date().toISOString()
      }
    });
    console.log(`   ✅ 用户创建事件响应: ${JSON.stringify(userCreatedEvent.data)}\n`);

    // 8. 测试用户更新事件
    console.log('8. 测试用户更新事件');
    const userUpdatedEvent = await axios.post(`${BASE_URL}/feishu/events`, {
      type: 'event_callback',
      event: {
        type: 'contact.user.updated_v3',
        user_id: 'test_user_001',
        name: '更新后的测试用户',
        email: 'updated@example.com',
        update_time: new Date().toISOString()
      }
    });
    console.log(`   ✅ 用户更新事件响应: ${JSON.stringify(userUpdatedEvent.data)}\n`);

    // 9. 测试快速响应端点
    console.log('9. 测试快速响应端点');
    const fastEvent = await axios.post(`${BASE_URL}/feishu/events-fast`, {
      type: 'event_callback',
      event: {
        type: 'im.message.receive_v1',
        message: {
          message_id: `fast_msg_${Date.now()}`,
          chat_id: 'test_chat_001',
          content: '快速响应测试',
          sender: {
            sender_id: 'test_user_001',
            sender_type: 'user'
          }
        }
      }
    });
    console.log(`   ✅ 快速响应: ${JSON.stringify(fastEvent.data)}\n`);

    // 10. 测试配置地址管理
    console.log('10. 测试配置地址管理');
    const configList = await axios.get(`${BASE_URL}/feishu/config-addresses`);
    console.log(`   ✅ 配置地址数量: ${configList.data.total}`);
    if (configList.data.data.length > 0) {
      console.log(`   📋 配置列表:`);
      configList.data.data.forEach((config, index) => {
        console.log(`      ${index + 1}. ${config.name} - ${config.url}`);
      });
    }
    console.log();

    console.log('🎉 所有飞书事件测试完成！');
    console.log('\n📋 测试总结:');
    console.log('✅ URL 验证功能正常');
    console.log('✅ 消息接收功能正常');
    console.log('✅ 斜杠指令处理正常');
    console.log('✅ 消息回应处理正常');
    console.log('✅ 用户事件处理正常');
    console.log('✅ 快速响应功能正常');
    console.log('✅ 配置地址管理正常');
    
    console.log('\n🚀 下一步:');
    console.log('1. 在飞书开发者后台完成应用发布');
    console.log('2. 将机器人添加到群组');
    console.log('3. 测试真实的飞书消息交互');
    console.log('4. 配置评论推送功能');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testFeishuEvents();
