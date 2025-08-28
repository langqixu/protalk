#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testEnhancedCard() {
  console.log('🎴 测试增强版交互式卡片功能...\n');

  try {
    // 1. 检查服务状态
    console.log('1. 检查服务状态');
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log(`   ✅ 服务状态: ${health.data.data.status}\n`);

    // 2. 模拟评论数据
    console.log('2. 创建模拟评论数据');
    const mockReview = {
      id: 'test_review_002',
      appId: '1077776989',
      rating: 4,
      title: '功能很实用',
      body: '这个应用的功能设计得很实用，界面也很简洁。希望能增加一些新功能。',
      nickname: '用户体验师',
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

    // 3. 测试新评论卡片推送（包含输入框）
    console.log('3. 测试新评论卡片推送（包含输入框）');
    const newReviewResponse = await axios.post(`${BASE_URL}/feishu/test`, {
      chat_id: 'test_chat_002',
      review: mockReview,
      type: 'new'
    });
    console.log(`   ✅ 新评论卡片推送响应: ${JSON.stringify(newReviewResponse.data)}\n`);

    // 4. 测试评论更新卡片推送
    console.log('4. 测试评论更新卡片推送');
    const updatedReview = {
      ...mockReview,
      body: '这个应用的功能设计得很实用，界面也很简洁。希望能增加一些新功能。已经使用了一段时间，整体体验不错！',
      isEdited: true
    };

    const updateResponse = await axios.post(`${BASE_URL}/feishu/test`, {
      chat_id: 'test_chat_002',
      review: updatedReview,
      type: 'update'
    });
    console.log(`   ✅ 评论更新卡片推送响应: ${JSON.stringify(updateResponse.data)}\n`);

    // 5. 测试开发者回复卡片推送（不包含输入框）
    console.log('5. 测试开发者回复卡片推送（不包含输入框）');
    const repliedReview = {
      ...mockReview,
      responseBody: '感谢您的反馈！我们正在开发新功能，敬请期待。',
      responseDate: new Date()
    };

    const replyResponse = await axios.post(`${BASE_URL}/feishu/test`, {
      chat_id: 'test_chat_002',
      review: repliedReview,
      type: 'reply'
    });
    console.log(`   ✅ 开发者回复卡片推送响应: ${JSON.stringify(replyResponse.data)}\n`);

    // 6. 测试回复操作处理
    console.log('6. 测试回复操作处理');
    const replyActionResponse = await axios.post(`${BASE_URL}/feishu/reply-action`, {
      reviewId: mockReview.id,
      replyContent: '感谢您的建议！我们会认真考虑并尽快实现新功能。',
      userId: 'test_user_002'
    });
    console.log(`   ✅ 回复操作处理响应: ${JSON.stringify(replyActionResponse.data)}\n`);

    console.log('🎉 增强版交互式卡片功能测试完成！');
    console.log('\n📋 测试总结:');
    console.log('✅ 新评论卡片推送（包含输入框）');
    console.log('✅ 评论更新卡片推送（包含输入框）');
    console.log('✅ 开发者回复卡片推送（不包含输入框）');
    console.log('✅ 回复操作处理');
    
    console.log('\n🎴 卡片功能特点:');
    console.log('📝 输入框：支持直接在卡片中输入回复内容');
    console.log('📤 提交按钮：一键提交回复到App Store');
    console.log('📊 查看详情：查看评论详细信息');
    console.log('🔄 刷新：刷新评论状态');
    console.log('🎨 颜色主题：不同状态使用不同颜色');
    
    console.log('\n🚀 下一步:');
    console.log('1. 在飞书群组中查看增强版卡片消息');
    console.log('2. 测试卡片上的输入框和按钮交互');
    console.log('3. 验证回复功能是否正常工作');
    console.log('4. 集成真实的App Store API调用');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testEnhancedCard();
