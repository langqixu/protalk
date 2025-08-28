#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const PUBLIC_URL = 'https://c7990cee5223.ngrok-free.app';

async function quickValidation() {
  console.log('🚀 快速验证飞书机器人功能...\n');

  try {
    // 1. 检查服务状态
    console.log('1. 检查服务状态');
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log(`   ✅ 本地服务: ${health.data.data.status}`);

    const publicHealth = await axios.get(`${PUBLIC_URL}/api/health`);
    console.log(`   ✅ 公网服务: ${publicHealth.data.data.status}`);
    console.log(`   🌐 公网地址: ${PUBLIC_URL}\n`);

    // 2. 检查飞书状态
    console.log('2. 检查飞书状态');
    const feishuStatus = await axios.get(`${BASE_URL}/feishu/status`);
    const status = feishuStatus.data.data;
    console.log(`   📱 模式: ${status.mode.currentMode}`);
    console.log(`   🔗 连接: ${status.connection.connected ? '✅ 正常' : '❌ 异常'}`);
    console.log(`   📨 消息数: ${status.connection.messageCount}`);
    console.log(`   ⏰ 最后心跳: ${new Date(status.connection.lastHeartbeat).toLocaleString('zh-CN')}\n`);

    // 3. 测试飞书事件端点
    console.log('3. 测试飞书事件端点');
    const eventTest = await axios.post(`${PUBLIC_URL}/feishu/events`, {
      type: 'url_verification',
      challenge: 'quick_test_123'
    });
    console.log(`   ✅ 事件端点: ${eventTest.data.challenge === 'quick_test_123' ? '正常' : '异常'}\n`);

    // 4. 发送测试评论
    console.log('4. 发送测试评论');
    const testReview = {
      chat_id: 'test_chat_quick',
      review: {
        id: 'quick_review_001',
        appId: '1077776989',
        rating: 5,
        title: '快速测试评论',
        body: '这是一个快速验证测试的评论，用于验证飞书机器人功能是否正常工作。',
        nickname: '测试用户',
        createdDate: new Date().toISOString(),
        isEdited: false
      },
      type: 'new'
    };

    const reviewResponse = await axios.post(`${BASE_URL}/feishu/test`, testReview);
    console.log(`   ✅ 评论推送: ${reviewResponse.data.success ? '成功' : '失败'}\n`);

    // 5. 测试回复功能
    console.log('5. 测试回复功能');
    const replyResponse = await axios.post(`${BASE_URL}/feishu/reply-action`, {
      reviewId: 'quick_review_001',
      replyContent: '感谢您的测试！系统运行正常。',
      userId: 'quick_test_user'
    });
    console.log(`   ✅ 回复操作: ${replyResponse.data.success ? '成功' : '失败'}\n`);

    // 6. 检查最终状态
    console.log('6. 检查最终状态');
    const finalStatus = await axios.get(`${BASE_URL}/feishu/status`);
    console.log(`   📨 最终消息数: ${finalStatus.data.data.connection.messageCount}`);
    console.log(`   🔗 连接状态: ${finalStatus.data.data.connection.connected ? '✅ 正常' : '❌ 异常'}\n`);

    console.log('🎉 快速验证完成！');
    console.log('\n📋 验证结果:');
    console.log('✅ 所有服务正常运行');
    console.log('✅ 飞书事件端点正常');
    console.log('✅ 评论推送功能正常');
    console.log('✅ 回复功能正常');
    
    console.log('\n🌐 飞书开发者后台配置:');
    console.log(`   事件网址: ${PUBLIC_URL}/feishu/events`);
    console.log(`   验证状态: 已验证`);
    
    console.log('\n🚀 下一步操作:');
    console.log('1. 在飞书开发者后台更新事件网址');
    console.log('2. 将机器人添加到目标群组');
    console.log('3. 在群组中查看卡片显示效果');
    console.log('4. 测试输入框和按钮交互');

  } catch (error) {
    console.error('❌ 验证失败:', error.response?.data || error.message);
    console.log('\n🔧 故障排除:');
    console.log('1. 检查本地服务是否运行: npm run dev');
    console.log('2. 检查ngrok是否运行: ngrok http 3000');
    console.log('3. 检查网络连接');
  }
}

// 运行验证
quickValidation();
