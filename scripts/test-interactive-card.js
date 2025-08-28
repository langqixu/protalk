#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testInteractiveCard() {
  console.log('🎴 测试交互式卡片功能...\n');

  try {
    // 1. 检查服务状态
    console.log('1. 检查服务状态');
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log(`   ✅ 服务状态: ${health.data.data.status}\n`);

    // 2. 模拟评论数据
    console.log('2. 创建模拟评论数据');
    const mockReview = {
      id: 'test_review_001',
      appId: '1077776989',
      rating: 5,
      title: '非常棒的应用！',
      body: '这个应用真的很棒，界面设计很美观，功能也很实用。强烈推荐给大家使用！',
      nickname: '测试用户',
      createdDate: new Date(),
      isEdited: false,
      responseBody: null,
      responseDate: null
    };

    console.log('   📝 评论信息:', {
      id: mockReview.id,
      rating: mockReview.rating,
      title: mockReview.title,
      nickname: mockReview.nickname
    });

    // 3. 测试评论推送（新评论）
    console.log('3. 测试新评论推送');
    const newReviewResponse = await axios.post(`${BASE_URL}/feishu/test`, {
      chat_id: 'test_chat_001',
      review: mockReview,
      type: 'new'
    });
    console.log(`   ✅ 新评论推送响应: ${JSON.stringify(newReviewResponse.data)}\n`);

    // 4. 测试评论更新推送
    console.log('4. 测试评论更新推送');
    const updatedReview = {
      ...mockReview,
      body: '这个应用真的很棒，界面设计很美观，功能也很实用。强烈推荐给大家使用！已经使用了一个月了，体验非常好。',
      isEdited: true
    };

    const updateResponse = await axios.post(`${BASE_URL}/feishu/test`, {
      chat_id: 'test_chat_001',
      review: updatedReview,
      type: 'update'
    });
    console.log(`   ✅ 评论更新推送响应: ${JSON.stringify(updateResponse.data)}\n`);

    // 5. 测试开发者回复推送
    console.log('5. 测试开发者回复推送');
    const repliedReview = {
      ...mockReview,
      responseBody: '感谢您的评价！我们会继续努力改进产品，为用户提供更好的体验。',
      responseDate: new Date()
    };

    const replyResponse = await axios.post(`${BASE_URL}/feishu/test`, {
      chat_id: 'test_chat_001',
      review: repliedReview,
      type: 'reply'
    });
    console.log(`   ✅ 开发者回复推送响应: ${JSON.stringify(replyResponse.data)}\n`);

    // 6. 测试回复操作处理
    console.log('6. 测试回复操作处理');
    const replyActionResponse = await axios.post(`${BASE_URL}/feishu/reply-action`, {
      reviewId: mockReview.id,
      replyContent: '感谢您的反馈，我们会认真考虑您的建议！',
      userId: 'test_user_001'
    });
    console.log(`   ✅ 回复操作处理响应: ${JSON.stringify(replyActionResponse.data)}\n`);

    console.log('🎉 交互式卡片功能测试完成！');
    console.log('\n📋 测试总结:');
    console.log('✅ 新评论卡片推送');
    console.log('✅ 评论更新卡片推送');
    console.log('✅ 开发者回复卡片推送');
    console.log('✅ 回复操作处理');
    
    console.log('\n🚀 下一步:');
    console.log('1. 在飞书群组中查看卡片消息');
    console.log('2. 测试卡片上的按钮交互');
    console.log('3. 验证回复功能');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testInteractiveCard();
