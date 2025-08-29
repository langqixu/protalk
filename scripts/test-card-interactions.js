#!/usr/bin/env node

/**
 * 测试新的卡片交互功能
 * 验证回复评论、编辑回复、报告问题等完整流程
 */

const axios = require('axios');

// 配置
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const REVIEW_ID = 'test_review_' + Date.now();

// 测试用的评论数据
const testReview = {
  reviewId: REVIEW_ID,
  appId: '1077776989',
  rating: 5,
  title: '测试交互功能',
  body: '这是一个测试评论，用于验证新的卡片交互功能，包括回复、编辑和报告问题等功能。',
  reviewerNickname: '测试用户',
  createdDate: new Date().toISOString(),
  isEdited: false,
  appVersion: '4.5.4',
  territoryCode: 'CN',
  cardState: 'initial'
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCardInteractions() {
  console.log('🚀 开始测试卡片交互功能...\n');

  try {
    // 1. 测试基础卡片生成
    console.log('📋 步骤 1: 测试基础卡片生成');
    const cardResponse = await axios.post(`${BASE_URL}/feishu/test/card-v2?type=review`, testReview);
    console.log('✅ 基础卡片生成成功');
    console.log(`   - 卡片元素数量: ${cardResponse.data.elements?.length || 0}`);
    
    await sleep(1000);

    // 2. 测试回复评论按钮交互
    console.log('\n💬 步骤 2: 测试回复评论交互');
    const replyAction = {
      action: 'reply_review',
      review_id: REVIEW_ID,
      app_name: '潮汐 for iOS',
      author: '测试用户'
    };
    
    const replyResponse = await axios.post(`${BASE_URL}/feishu/card-actions`, {
      action: { value: replyAction },
      user_id: 'test_user_123',
      message_id: 'test_message_' + Date.now()
    });
    console.log('✅ 回复评论交互触发成功');
    
    await sleep(1000);

    // 3. 测试提交回复功能
    console.log('\n📤 步骤 3: 测试提交回复功能');
    const submitAction = {
      action: 'submit_reply',
      review_id: REVIEW_ID,
      app_name: '潮汐 for iOS',
      author: '测试用户',
      reply_content: '感谢您的反馈！我们会继续改进产品体验。'
    };
    
    const submitResponse = await axios.post(`${BASE_URL}/feishu/card-actions`, {
      action: { 
        value: submitAction,
        form_value: { reply_content: submitAction.reply_content }
      },
      user_id: 'test_user_123',
      message_id: 'test_message_' + Date.now()
    });
    console.log('✅ 提交回复功能触发成功');
    
    await sleep(1000);

    // 4. 测试编辑回复功能
    console.log('\n✏️ 步骤 4: 测试编辑回复功能');
    const editAction = {
      action: 'edit_reply',
      review_id: REVIEW_ID,
      app_name: '潮汐 for iOS',
      author: '测试用户'
    };
    
    const editResponse = await axios.post(`${BASE_URL}/feishu/card-actions`, {
      action: { value: editAction },
      user_id: 'test_user_123',
      message_id: 'test_message_' + Date.now()
    });
    console.log('✅ 编辑回复功能触发成功');
    
    await sleep(1000);

    // 5. 测试取消操作
    console.log('\n❌ 步骤 5: 测试取消操作');
    const cancelAction = {
      action: 'cancel_reply',
      review_id: REVIEW_ID
    };
    
    const cancelResponse = await axios.post(`${BASE_URL}/feishu/card-actions`, {
      action: { value: cancelAction },
      user_id: 'test_user_123',
      message_id: 'test_message_' + Date.now()
    });
    console.log('✅ 取消操作功能触发成功');
    
    await sleep(1000);

    // 6. 测试报告问题功能
    console.log('\n🚩 步骤 6: 测试报告问题功能');
    const reportAction = {
      action: 'report_issue',
      review_id: REVIEW_ID,
      app_name: '潮汐 for iOS',
      author: '测试用户',
      trigger_id: 'test_trigger_' + Date.now()
    };
    
    const reportResponse = await axios.post(`${BASE_URL}/feishu/card-actions`, {
      action: { value: reportAction },
      user_id: 'test_user_123',
      message_id: 'test_message_' + Date.now()
    });
    console.log('✅ 报告问题功能触发成功');
    
    await sleep(1000);

    // 7. 测试模态对话框提交（模拟）
    console.log('\n📋 步骤 7: 测试模态对话框提交');
    const modalSubmit = {
      view: {
        view_id: 'test_view_' + Date.now(),
        external_id: REVIEW_ID,
        state: {
          values: {
            block1: {
              issue_type: {
                option: { value: 'spam' }
              }
            },
            block2: {
              description: {
                value: '这是一个测试报告，用于验证问题报告功能。'
              }
            }
          }
        }
      },
      user_id: 'test_user_123'
    };
    
    const modalResponse = await axios.post(`${BASE_URL}/feishu/modal-actions`, modalSubmit);
    console.log('✅ 模态对话框提交功能触发成功');

    // 8. 测试状态管理
    console.log('\n🔄 步骤 8: 测试不同状态的卡片生成');
    
    const states = ['initial', 'replying', 'replied', 'editing_reply'];
    for (const state of states) {
      const stateTest = { ...testReview, card_state: state };
      if (state === 'replied' || state === 'editing_reply') {
        stateTest.developer_response = {
          body: '感谢您的反馈！',
          date: new Date().toISOString()
        };
      }
      
      const stateResponse = await axios.post(`${BASE_URL}/feishu/test/card-v2?type=review`, stateTest);
      console.log(`   ✅ ${state} 状态卡片生成成功`);
      await sleep(500);
    }

    console.log('\n🎉 所有交互功能测试完成！');
    console.log('\n📊 测试总结:');
    console.log('   - ✅ 基础卡片生成');
    console.log('   - ✅ 回复评论交互');
    console.log('   - ✅ 提交回复功能');
    console.log('   - ✅ 编辑回复功能');
    console.log('   - ✅ 取消操作功能');
    console.log('   - ✅ 报告问题功能');
    console.log('   - ✅ 模态对话框提交');
    console.log('   - ✅ 状态管理功能');
    
  } catch (error) {
    console.error('\n❌ 测试过程中出现错误:');
    if (error.response) {
      console.error(`   HTTP ${error.response.status}: ${error.response.data?.error || error.response.statusText}`);
      if (error.response.data?.details) {
        console.error(`   详细信息: ${JSON.stringify(error.response.data.details, null, 2)}`);
      }
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testCardInteractions();
}

module.exports = { testCardInteractions };
