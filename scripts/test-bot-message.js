#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testBotMessage() {
  console.log('🤖 测试机器人消息发送功能...\n');

  try {
    // 1. 测试发送消息到飞书
    console.log('1. 测试发送消息到飞书');
    const messageResponse = await axios.post(`${BASE_URL}/feishu/test`, {
      chat_id: 'your_chat_id_here', // 需要替换为实际的群组ID
      message: '🧪 这是一条测试消息\n\n时间：' + new Date().toLocaleString('zh-CN')
    });
    console.log(`   ✅ 消息发送响应: ${JSON.stringify(messageResponse.data)}\n`);

    // 2. 测试评论推送功能
    console.log('2. 测试评论推送功能');
    const reviewData = {
      id: 'test_review_001',
      appId: '1077776989',
      rating: 5,
      title: '测试评论标题',
      body: '这是一条测试评论内容，用于验证推送功能是否正常工作。',
      nickname: '测试用户',
      createdDate: new Date(),
      isEdited: false
    };

    // 模拟评论推送
    console.log('   📝 模拟评论数据:', {
      id: reviewData.id,
      rating: reviewData.rating,
      title: reviewData.title,
      nickname: reviewData.nickname
    });

    // 3. 测试服务状态
    console.log('3. 测试服务状态');
    const statusResponse = await axios.get(`${BASE_URL}/feishu/status`);
    console.log(`   ✅ 服务状态: ${statusResponse.data.data.mode.currentMode}`);
    console.log(`   ✅ 连接状态: ${statusResponse.data.data.connection.connected ? '已连接' : '未连接'}\n`);

    // 4. 测试配置地址
    console.log('4. 测试配置地址');
    const configResponse = await axios.get(`${BASE_URL}/feishu/config-addresses`);
    console.log(`   ✅ 配置地址数量: ${configResponse.data.total}`);
    if (configResponse.data.data.length > 0) {
      console.log('   📋 当前配置:');
      configResponse.data.data.forEach((config, index) => {
        console.log(`      ${index + 1}. ${config.name} - ${config.url}`);
      });
    }
    console.log();

    console.log('🎉 机器人消息测试完成！');
    console.log('\n📋 下一步操作:');
    console.log('1. 在飞书群组中发送消息测试');
    console.log('2. 尝试斜杠指令: /help, /status');
    console.log('3. 测试消息回应功能');
    console.log('4. 验证评论推送功能');

    console.log('\n💡 提示:');
    console.log('- 确保机器人已添加到群组');
    console.log('- 确保机器人有发送消息权限');
    console.log('- 检查服务器日志查看详细信息');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      console.log('\n💡 解决方案:');
      console.log('- 检查 chat_id 是否正确');
      console.log('- 确认机器人权限设置');
      console.log('- 验证群组配置');
    }
  }
}

// 运行测试
testBotMessage();
