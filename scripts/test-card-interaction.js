#!/usr/bin/env node

/**
 * 测试飞书卡片交互功能
 * 验证按钮点击、输入框、回复成功/失败状态显示
 */

const axios = require('axios');
const { ReviewCardTemplates } = require('../dist/utils/review-card-templates');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

console.log('🧪 开始测试飞书卡片交互功能...\n');

async function testCardInteraction() {
  try {
    // 1. 测试发送带交互功能的评论卡片
    console.log('📤 测试1: 发送带交互功能的评论卡片');
    
    const reviewCard = ReviewCardTemplates.createStandardReviewCard({
      id: 'test_review_001',
      app_id: '1077776989',
      app_name: '潮汐 for iOS',
      author: '测试用户',
      rating: 4,
      title: '很好用的应用',
      content: '界面设计很棒，功能也很实用，就是有些小问题希望能改进。',
      date: new Date().toISOString(),
      store_type: 'ios',
      version: '3.2.1',
      country: 'CN'
    });

    const cardResponse = await axios.post(`${BASE_URL}/feishu/messages/card`, {
      card: reviewCard
    });

    console.log('✅ 评论卡片发送成功:', {
      message_id: cardResponse.data.data.message_id,
      chat_id: cardResponse.data.data.chat_id
    });

    // 2. 测试回复成功状态卡片
    console.log('\n📤 测试2: 发送回复成功状态卡片');
    
    const successCard = ReviewCardTemplates.createReplySuccessCard(
      'test_review_001',
      '感谢您的反馈！我们会继续努力改进产品，为用户提供更好的体验。新版本将会解决您提到的问题。'
    );

    const successResponse = await axios.post(`${BASE_URL}/feishu/messages/card`, {
      card: successCard
    });

    console.log('✅ 成功状态卡片发送成功:', {
      message_id: successResponse.data.data.message_id
    });

    // 3. 测试回复失败状态卡片
    console.log('\n📤 测试3: 发送回复失败状态卡片');
    
    const errorCard = ReviewCardTemplates.createReplyErrorCard(
      'test_review_001',
      '网络连接超时，请检查网络设置后重试'
    );

    const errorResponse = await axios.post(`${BASE_URL}/feishu/messages/card`, {
      card: errorCard
    });

    console.log('✅ 失败状态卡片发送成功:', {
      message_id: errorResponse.data.data.message_id
    });

    // 4. 测试卡片交互API端点
    console.log('\n📤 测试4: 测试卡片交互API端点');
    
    const interactionResponse = await axios.post(`${BASE_URL}/feishu/card-actions`, {
      action: {
        value: {
          action: 'submit_reply',
          review_id: 'test_review_001',
          app_id: '1077776989',
          reply_content: '这是一个测试回复内容'
        }
      },
      user_id: 'test_user_001',
      message_id: 'test_message_001'
    });

    console.log('✅ 卡片交互API测试成功:', interactionResponse.data);

    // 5. 测试服务状态
    console.log('\n📊 测试5: 检查服务状态');
    
    const statusResponse = await axios.get(`${BASE_URL}/feishu/status`);
    console.log('✅ 服务状态正常:', {
      isHealthy: statusResponse.data.data.isHealthy,
      messageCount: statusResponse.data.data.messageCount
    });

    console.log('\n🎉 所有测试通过！卡片交互功能正常工作。');

  } catch (error) {
    console.error('❌ 测试失败:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.response?.data?.error) {
      console.error('错误详情:', error.response.data.error);
    }
    
    process.exit(1);
  }
}

// 运行测试
testCardInteraction().catch(error => {
  console.error('💥 测试执行异常:', error);
  process.exit(1);
});
