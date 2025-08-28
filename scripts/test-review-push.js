#!/usr/bin/env node

const axios = require('axios');

async function testReviewPush() {
  console.log('📱 测试评论推送到飞书...\n');

  try {
    // 1. 测试新评论推送
    console.log('1. 测试新评论推送');
    const newReview = {
      content: `📱 **App Store 新评论通知**

⭐ **评分**: 5星
👤 **用户**: 满意用户
📅 **时间**: ${new Date().toLocaleString('zh-CN')}
📝 **标题**: 🎉 非常棒的应用体验！
💬 **内容**: 这个应用的设计真的很棒，界面简洁美观，功能也很实用。用户体验非常好，强烈推荐！

🔗 **操作**: 点击查看详情或回复评论`
    };

    const newResult = await axios.post('http://localhost:3000/feishu/send-message', newReview);
    console.log(`   ✅ 新评论推送结果: ${JSON.stringify(newResult.data)}\n`);

    // 等待2秒
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. 测试评论更新推送
    console.log('2. 测试评论更新推送');
    const updateReview = {
      content: `📱 **App Store 评论更新通知**

⭐ **评分**: 4星 (已更新)
👤 **用户**: 更新用户
📅 **时间**: ${new Date().toLocaleString('zh-CN')}
📝 **标题**: 📝 评论已更新
💬 **内容**: 用户修改了评论内容，现在评分是4星，但仍然很满意应用的功能。

🔄 **状态**: 评论已更新
🔗 **操作**: 点击查看详情或回复评论`
    };

    const updateResult = await axios.post('http://localhost:3000/feishu/send-message', updateReview);
    console.log(`   ✅ 评论更新推送结果: ${JSON.stringify(updateResult.data)}\n`);

    // 等待2秒
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. 测试开发者回复推送
    console.log('3. 测试开发者回复推送');
    const replyReview = {
      content: `📱 **App Store 开发者回复通知**

⭐ **评分**: 5星
👤 **用户**: 满意用户
📅 **时间**: ${new Date().toLocaleString('zh-CN')}
💬 **用户评论**: 这个应用真的很棒，界面简洁美观，功能也很实用！

💬 **开发者回复**: 感谢您的反馈！我们会继续改进产品体验，为用户提供更好的服务。

✅ **状态**: 已回复
🔗 **操作**: 点击查看详情`
    };

    const replyResult = await axios.post('http://localhost:3000/feishu/send-message', replyReview);
    console.log(`   ✅ 开发者回复推送结果: ${JSON.stringify(replyResult.data)}\n`);

    console.log('🎉 所有评论推送测试完成！');
    console.log('\n📋 测试结果:');
    console.log('✅ 新评论推送 - 成功');
    console.log('✅ 评论更新推送 - 成功');
    console.log('✅ 开发者回复推送 - 成功');
    console.log('\n🎯 请在飞书群组中查看这些消息！');

  } catch (error) {
    console.error('❌ 评论推送测试失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

testReviewPush().catch(console.error);
