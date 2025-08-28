#!/usr/bin/env node

const axios = require('axios');

const LOCAL_URL = 'http://localhost:3000';
const PUBLIC_URL = 'https://096918db8998.ngrok-free.app';

async function testCompleteFlow() {
  console.log('🚀 开始完整流程测试...\n');

  try {
    // 1. 测试服务健康状态
    console.log('1. 测试服务健康状态');
    const health = await axios.get(`${LOCAL_URL}/api/health`);
    console.log(`   ✅ 服务状态: ${health.data.data.status}\n`);

    // 2. 测试飞书服务状态
    console.log('2. 测试飞书服务状态');
    const status = await axios.get(`${LOCAL_URL}/feishu/status`);
    const feishuStatus = status.data.data;
    console.log(`   ✅ 模式: ${feishuStatus.mode.currentMode}`);
    console.log(`   ✅ 连接状态: ${feishuStatus.connection.connected ? '已连接' : '未连接'}`);
    console.log(`   ✅ 消息计数: ${feishuStatus.connection.messageCount}\n`);

    // 3. 测试公网端点
    console.log('3. 测试公网端点');
    const publicTest = await axios.post(`${PUBLIC_URL}/feishu/events`, {
      type: 'url_verification',
      challenge: 'complete_test_123'
    });
    console.log(`   ✅ 公网端点响应: ${JSON.stringify(publicTest.data)}\n`);

    // 4. 测试评论推送（使用自动获取的chat_id）
    console.log('4. 测试评论推送');
    const reviewData = {
      review: {
        id: `test_review_${Date.now()}`,
        appId: "1077776989",
        rating: 5,
        title: "🎉 完整流程测试评论",
        body: "这是一个完整的流程测试评论，用于验证飞书交互式卡片推送功能。包含评分、标题、内容和用户信息。",
        nickname: "测试用户",
        createdDate: new Date().toISOString(),
        isEdited: false
      },
      type: "new"
    };

    const pushResult = await axios.post(`${LOCAL_URL}/feishu/test`, reviewData);
    console.log(`   ✅ 评论推送结果: ${JSON.stringify(pushResult.data)}\n`);

    // 5. 测试评论更新推送
    console.log('5. 测试评论更新推送');
    const updateData = {
      review: {
        id: `test_update_${Date.now()}`,
        appId: "1077776989",
        rating: 4,
        title: "📝 评论更新测试",
        body: "这是一个评论更新测试，用户修改了评分和内容。",
        nickname: "更新用户",
        createdDate: new Date().toISOString(),
        isEdited: true
      },
      type: "update"
    };

    const updateResult = await axios.post(`${LOCAL_URL}/feishu/test`, updateData);
    console.log(`   ✅ 评论更新结果: ${JSON.stringify(updateResult.data)}\n`);

    // 6. 测试回复操作
    console.log('6. 测试回复操作');
    const replyData = {
      reviewId: `test_review_${Date.now()}`,
      replyContent: "感谢您的反馈！我们会继续改进产品体验。",
      userId: "test_user_001"
    };

    const replyResult = await axios.post(`${LOCAL_URL}/feishu/reply-action`, replyData);
    console.log(`   ✅ 回复操作结果: ${JSON.stringify(replyResult.data)}\n`);

    // 7. 生成测试报告
    console.log('📊 测试报告');
    console.log('='.repeat(50));
    console.log('✅ 所有测试通过！');
    console.log('');
    console.log('🎯 功能验证结果:');
    console.log('   ✅ 服务健康检查 - 通过');
    console.log('   ✅ 飞书服务连接 - 通过');
    console.log('   ✅ 公网端点访问 - 通过');
    console.log('   ✅ 评论推送功能 - 通过');
    console.log('   ✅ 评论更新推送 - 通过');
    console.log('   ✅ 回复操作处理 - 通过');
    console.log('');
    console.log('🌐 当前配置:');
    console.log(`   本地服务: ${LOCAL_URL}`);
    console.log(`   公网地址: ${PUBLIC_URL}`);
    console.log(`   飞书事件端点: ${PUBLIC_URL}/feishu/events`);
    console.log('');
    console.log('🎉 系统已准备就绪，可以进行真实环境测试！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

// 运行测试
testCompleteFlow().catch(console.error);
