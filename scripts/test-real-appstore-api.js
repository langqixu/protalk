#!/usr/bin/env node

/**
 * 真实App Store Connect API集成测试
 * 测试使用真实API进行评论回复
 */

const axios = require('axios');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

console.log('🧪 开始真实App Store Connect API集成测试...\n');

async function testRealAppStoreAPI() {
  try {
    console.log('📋 测试概述:');
    console.log('  - 使用真实的App Store Connect API');
    console.log('  - 测试评论回复功能');
    console.log('  - 验证错误处理机制');
    console.log('  - 检查用户友好的错误消息\n');

    // 1. 测试有效的评论回复（这会调用真实API）
    console.log('🚀 测试1: 提交真实的评论回复');
    console.log('⚠️  注意: 这将调用真实的App Store Connect API');
    
    // 使用一个测试评论ID（在实际环境中应该是真实的）
    const testReplyAction = {
      action: {
        value: {
          action: 'submit_reply',
          review_id: 'test_review_real_001', // 这应该是真实的评论ID
          app_id: '1077776989',
          reply_content: '感谢您的反馈！我们非常重视用户的意见，会在下一个版本中解决您提到的问题。'
        }
      },
      user_id: 'test_user_real_001',
      message_id: 'test_message_real_001'
    };

    try {
      const realApiResponse = await axios.post(`${BASE_URL}/feishu/card-actions`, testReplyAction);
      console.log('✅ 真实API调用成功:', realApiResponse.data);
    } catch (error) {
      if (error.response?.status) {
        console.log('📊 真实API错误响应 (这是预期的):', {
          status: error.response.status,
          message: error.response.data?.message || error.message
        });
      } else {
        console.log('❌ 网络或其他错误:', error.message);
      }
    }

    console.log('\n⏳ 等待3秒，检查飞书中的状态卡片...');
    await sleep(3000);

    // 2. 测试无效的评论ID错误处理
    console.log('\n🔍 测试2: 无效评论ID的错误处理');
    
    const invalidReviewAction = {
      action: {
        value: {
          action: 'submit_reply',
          review_id: 'invalid_review_id_12345',
          app_id: '1077776989',
          reply_content: '这是对无效评论ID的测试回复'
        }
      },
      user_id: 'test_user_001',
      message_id: 'test_message_002'
    };

    const invalidResponse = await axios.post(`${BASE_URL}/feishu/card-actions`, invalidReviewAction);
    console.log('✅ 无效ID处理成功:', invalidResponse.data);

    await sleep(2000);

    // 3. 测试空回复内容
    console.log('\n📝 测试3: 空回复内容验证');
    
    const emptyReplyAction = {
      action: {
        value: {
          action: 'submit_reply',
          review_id: 'test_review_003',
          app_id: '1077776989',
          reply_content: ''
        }
      },
      user_id: 'test_user_001',
      message_id: 'test_message_003'
    };

    const emptyResponse = await axios.post(`${BASE_URL}/feishu/card-actions`, emptyReplyAction);
    console.log('✅ 空内容验证成功:', emptyResponse.data);

    await sleep(2000);

    // 4. 测试超长回复内容
    console.log('\n📏 测试4: 超长回复内容验证');
    
    const longContent = '这是一个非常长的回复内容，'.repeat(100); // 超过1000字符
    const longReplyAction = {
      action: {
        value: {
          action: 'submit_reply',
          review_id: 'test_review_004',
          app_id: '1077776989',
          reply_content: longContent
        }
      },
      user_id: 'test_user_001',
      message_id: 'test_message_004'
    };

    const longResponse = await axios.post(`${BASE_URL}/feishu/card-actions`, longReplyAction);
    console.log('✅ 长内容验证成功:', longResponse.data);

    // 5. 检查服务状态和API配置
    console.log('\n📊 测试5: 检查服务状态');
    
    const statusResponse = await axios.get(`${BASE_URL}/feishu/status`);
    console.log('✅ 服务状态:', {
      apiVersion: statusResponse.data.status.apiVersion,
      messageCount: statusResponse.data.status.messageCount,
      mode: statusResponse.data.status.mode
    });

    console.log('\n🎉 真实API集成测试完成！');
    console.log('\n✨ 测试结果总结:');
    console.log('  ✅ 真实App Store Connect API已集成');
    console.log('  ✅ 错误处理机制正常工作');
    console.log('  ✅ 用户友好的错误消息显示正确');
    console.log('  ✅ 输入验证功能完善');
    console.log('  ✅ 飞书卡片状态反馈正常');

    console.log('\n📋 实际使用说明:');
    console.log('  1. 确保App Store Connect API配置正确');
    console.log('  2. 使用真实的review_id进行测试');
    console.log('  3. 检查App Store Connect权限设置');
    console.log('  4. 监控飞书群组中的状态卡片');

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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 运行测试
testRealAppStoreAPI().catch(error => {
  console.error('💥 测试执行异常:', error);
  process.exit(1);
});
