#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAutoChatId() {
  console.log('🤖 测试自动获取群组ID和卡片消息发送...\n');

  try {
    // 1. 检查服务状态
    console.log('1. 检查服务状态');
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log(`   ✅ 服务状态: ${health.data.data.status}\n`);

    // 2. 发送测试评论卡片（自动获取群组ID）
    console.log('2. 发送测试评论卡片（自动获取群组ID）');
    const testReview = {
      chat_id: 'auto_detect', // 这个值会被忽略，服务会自动获取群组ID
      review: {
        id: 'auto_test_001',
        appId: '1077776989',
        rating: 5,
        title: '自动群组ID测试',
        body: '这是一个测试卡片消息，用于验证自动获取群组ID和发送卡片消息的功能。系统会自动找到第一个可用的群组并发送消息。',
        nickname: '自动测试用户',
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

    // 4. 发送评论更新卡片
    console.log('4. 发送评论更新卡片');
    const updateReview = {
      chat_id: 'auto_detect',
      review: {
        id: 'auto_test_002',
        appId: '1077776989',
        rating: 4,
        title: '功能很实用',
        body: '这个应用的功能设计得很实用，界面也很简洁。已经使用了一段时间，整体体验非常满意！希望能增加一些新功能。',
        nickname: '用户体验师',
        createdDate: new Date().toISOString(),
        isEdited: true
      },
      type: 'update'
    };

    const updateResponse = await axios.post(`${BASE_URL}/feishu/test`, updateReview);
    console.log(`   ✅ 更新卡片推送响应: ${JSON.stringify(updateResponse.data)}\n`);

    // 5. 测试回复功能
    console.log('5. 测试回复功能');
    const replyResponse = await axios.post(`${BASE_URL}/feishu/reply-action`, {
      reviewId: 'auto_test_001',
      replyContent: '感谢您的测试！系统运行正常，自动获取群组ID功能工作良好。',
      userId: 'auto_test_user'
    });
    console.log(`   ✅ 回复操作响应: ${JSON.stringify(replyResponse.data)}\n`);

    // 6. 最终状态检查
    console.log('6. 最终状态检查');
    const finalStatus = await axios.get(`${BASE_URL}/feishu/status`);
    console.log(`   📨 最终消息计数: ${finalStatus.data.data.connection.messageCount}`);
    console.log(`   🔗 连接状态: ${finalStatus.data.data.connection.connected ? '✅ 正常' : '❌ 异常'}\n`);

    console.log('🎉 自动群组ID测试完成！');
    console.log('\n📋 测试结果:');
    console.log('✅ 服务状态正常');
    console.log('✅ 自动获取群组ID功能');
    console.log('✅ 新评论卡片推送');
    console.log('✅ 评论更新卡片推送');
    console.log('✅ 回复功能测试');
    
    console.log('\n🎴 预期效果:');
    console.log('1. 系统自动找到第一个可用的群组');
    console.log('2. 在群组中显示蓝色主题的新评论卡片');
    console.log('3. 在群组中显示橙色主题的评论更新卡片');
    console.log('4. 显示绿色的回复确认卡片');
    
    console.log('\n🚀 下一步:');
    console.log('1. 检查飞书群组是否收到卡片消息');
    console.log('2. 验证卡片显示效果和交互功能');
    console.log('3. 测试输入框和按钮操作');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    console.log('\n🔧 故障排除:');
    console.log('1. 确保机器人已添加到至少一个群组');
    console.log('2. 检查飞书API权限配置');
    console.log('3. 查看服务日志获取详细错误信息');
  }
}

// 运行测试
testAutoChatId();
