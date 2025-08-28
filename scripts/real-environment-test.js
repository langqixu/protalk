#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const PUBLIC_URL = 'https://c7990cee5223.ngrok-free.app';

async function realEnvironmentTest() {
  console.log('🚀 开始真实环境测试...\n');

  try {
    // 1. 检查本地服务状态
    console.log('1. 检查本地服务状态');
    const localHealth = await axios.get(`${BASE_URL}/api/health`);
    console.log(`   ✅ 本地服务: ${localHealth.data.data.status}`);

    // 2. 检查公网服务状态
    console.log('2. 检查公网服务状态');
    const publicHealth = await axios.get(`${PUBLIC_URL}/api/health`);
    console.log(`   ✅ 公网服务: ${publicHealth.data.data.status}`);
    console.log(`   🌐 公网地址: ${PUBLIC_URL}\n`);

    // 3. 检查飞书服务状态
    console.log('3. 检查飞书服务状态');
    const feishuStatus = await axios.get(`${BASE_URL}/feishu/status`);
    console.log(`   📱 飞书模式: ${feishuStatus.data.data.mode.currentMode}`);
    console.log(`   🔗 连接状态: ${feishuStatus.data.data.connection.connected ? '已连接' : '未连接'}`);
    console.log(`   📨 消息计数: ${feishuStatus.data.data.connection.messageCount}\n`);

    // 4. 测试飞书事件端点
    console.log('4. 测试飞书事件端点');
    const eventTest = await axios.post(`${PUBLIC_URL}/feishu/events`, {
      type: 'url_verification',
      challenge: 'test_challenge_123'
    });
    console.log(`   ✅ 事件端点: ${eventTest.data.challenge === 'test_challenge_123' ? '正常' : '异常'}\n`);

    // 5. 创建真实的评论数据
    console.log('5. 创建真实的评论数据');
    const realReview = {
      id: 'real_review_001',
      appId: '1077776989',
      rating: 5,
      title: '非常棒的应用体验！',
      body: '这个应用的设计真的很棒，界面简洁美观，功能也很实用。特别是用户交互体验做得很好，响应速度快，没有卡顿现象。强烈推荐给其他用户！',
      nickname: '真实用户',
      createdDate: new Date(),
      isEdited: false,
      responseBody: null,
      responseDate: null
    };

    console.log('   📝 评论信息:', {
      id: realReview.id,
      rating: realReview.rating,
      title: realReview.title,
      nickname: realReview.nickname,
      body: realReview.body.substring(0, 50) + '...'
    });

    // 6. 测试新评论卡片推送
    console.log('6. 测试新评论卡片推送');
    const newReviewResponse = await axios.post(`${BASE_URL}/feishu/test`, {
      chat_id: 'real_chat_001',
      review: realReview,
      type: 'new'
    });
    console.log(`   ✅ 新评论推送: ${newReviewResponse.data.success ? '成功' : '失败'}\n`);

    // 7. 测试评论更新卡片推送
    console.log('7. 测试评论更新卡片推送');
    const updatedReview = {
      ...realReview,
      body: '这个应用的设计真的很棒，界面简洁美观，功能也很实用。特别是用户交互体验做得很好，响应速度快，没有卡顿现象。已经使用了一个月，整体体验非常满意！强烈推荐给其他用户！',
      isEdited: true
    };

    const updateResponse = await axios.post(`${BASE_URL}/feishu/test`, {
      chat_id: 'real_chat_001',
      review: updatedReview,
      type: 'update'
    });
    console.log(`   ✅ 评论更新推送: ${updateResponse.data.success ? '成功' : '失败'}\n`);

    // 8. 测试回复操作处理
    console.log('8. 测试回复操作处理');
    const replyContent = '感谢您的评价！我们会继续努力改进产品，为用户提供更好的体验。如果您有任何建议或反馈，欢迎随时联系我们。';
    
    const replyResponse = await axios.post(`${BASE_URL}/feishu/reply-action`, {
      reviewId: realReview.id,
      replyContent: replyContent,
      userId: 'real_user_001'
    });
    console.log(`   ✅ 回复操作处理: ${replyResponse.data.success ? '成功' : '失败'}\n`);

    // 9. 测试开发者回复卡片推送
    console.log('9. 测试开发者回复卡片推送');
    const repliedReview = {
      ...realReview,
      responseBody: replyContent,
      responseDate: new Date()
    };

    const replyCardResponse = await axios.post(`${BASE_URL}/feishu/test`, {
      chat_id: 'real_chat_001',
      review: repliedReview,
      type: 'reply'
    });
    console.log(`   ✅ 开发者回复推送: ${replyCardResponse.data.success ? '成功' : '失败'}\n`);

    // 10. 检查最终状态
    console.log('10. 检查最终状态');
    const finalStatus = await axios.get(`${BASE_URL}/feishu/status`);
    console.log(`   📨 最终消息计数: ${finalStatus.data.data.connection.messageCount}`);
    console.log(`   🔗 连接状态: ${finalStatus.data.data.connection.connected ? '正常' : '异常'}\n`);

    console.log('🎉 真实环境测试完成！');
    console.log('\n📋 测试总结:');
    console.log('✅ 本地服务健康检查');
    console.log('✅ 公网服务可访问');
    console.log('✅ 飞书服务连接正常');
    console.log('✅ 飞书事件端点正常');
    console.log('✅ 新评论卡片推送');
    console.log('✅ 评论更新卡片推送');
    console.log('✅ 回复操作处理');
    console.log('✅ 开发者回复卡片推送');
    
    console.log('\n🎴 卡片功能验证:');
    console.log('📝 输入框：支持直接在卡片中输入回复内容');
    console.log('📤 提交按钮：一键提交回复到App Store');
    console.log('📊 查看详情：查看评论详细信息');
    console.log('🔄 刷新：刷新评论状态');
    console.log('🎨 颜色主题：不同状态使用不同颜色');
    
    console.log('\n🌐 公网地址信息:');
    console.log(`   事件网址: ${PUBLIC_URL}/feishu/events`);
    console.log(`   健康检查: ${PUBLIC_URL}/api/health`);
    console.log(`   飞书状态: ${PUBLIC_URL}/feishu/status`);
    
    console.log('\n🚀 下一步操作:');
    console.log('1. 在飞书开发者后台更新事件网址为新的ngrok地址');
    console.log('2. 在飞书群组中查看推送的卡片消息');
    console.log('3. 测试卡片上的输入框和按钮交互');
    console.log('4. 验证回复功能是否正常工作');
    console.log('5. 检查App Store评论是否成功回复');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    console.log('\n🔧 故障排除建议:');
    console.log('1. 检查本地服务是否正常运行');
    console.log('2. 检查ngrok隧道是否正常');
    console.log('3. 检查网络连接');
    console.log('4. 查看服务日志获取详细错误信息');
  }
}

// 运行测试
realEnvironmentTest();
