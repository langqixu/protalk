#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'https://protalk.zeabur.app';

async function testReviewTextPush() {
  console.log('📱 测试App Store评论文本推送...\n');

  try {
    // 1. 检查当前消息计数
    console.log('1. 检查当前状态');
    const statusResponse = await axios.get(`${BASE_URL}/feishu/status`);
    const currentMessageCount = statusResponse.data.data.connection.messageCount;
    console.log(`   📊 当前消息计数: ${currentMessageCount}\n`);

    // 2. 创建模拟的App Store评论文本
    console.log('2. 创建评论文本消息');
    const reviewText = `📱 **App Store 新评论通知**

⭐⭐⭐⭐ 4星
👤 **用户**: 快乐用户123
📅 **时间**: ${new Date().toLocaleString('zh-CN')}
📝 **标题**: 非常好用的应用
💬 **内容**: 这个应用真的很棒！界面设计很美观，功能也很实用。希望开发者能继续保持，期待更多新功能！

🔗 **操作**: 点击查看详情或回复评论`;

    console.log('   📝 评论内容:', reviewText.substring(0, 100) + '...\n');

    // 3. 推送评论文本到飞书
    console.log('3. 推送评论文本到飞书');
    const pushResponse = await axios.post(`${BASE_URL}/feishu/send-to`, {
      chat_id: 'oc_130c7aece1e0c64c817d4bc764d1b686',
      content: reviewText
    });

    console.log(`   ✅ 推送响应: ${JSON.stringify(pushResponse.data)}\n`);

    // 4. 等待处理
    console.log('4. 等待处理完成...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 5. 检查处理后的状态
    console.log('5. 检查处理后的状态');
    const newStatusResponse = await axios.get(`${BASE_URL}/feishu/status`);
    const newMessageCount = newStatusResponse.data.data.connection.messageCount;
    console.log(`   📊 新的消息计数: ${newMessageCount}`);
    console.log(`   📈 消息计数变化: ${newMessageCount - currentMessageCount}\n`);

    if (newMessageCount > currentMessageCount) {
      console.log('✅ 评论文本推送成功！');
      console.log('💡 请在飞书群组中查看是否收到了评论通知消息');
    } else {
      console.log('❌ 评论文本推送失败！');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testReviewTextPush().catch(console.error);
