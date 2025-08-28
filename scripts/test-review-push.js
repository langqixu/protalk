#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'https://protalk.zeabur.app';

async function testReviewPush() {
  console.log('📱 测试App Store评论推送到飞书...\n');

  try {
    // 1. 检查当前消息计数
    console.log('1. 检查当前状态');
    const statusResponse = await axios.get(`${BASE_URL}/feishu/status`);
    const currentMessageCount = statusResponse.data.data.connection.messageCount;
    console.log(`   📊 当前消息计数: ${currentMessageCount}\n`);

    // 2. 创建模拟的App Store评论
    console.log('2. 创建模拟评论数据');
    const mockReview = {
      id: `review_${Date.now()}`,
      appId: 'com.example.app',
      rating: 4,
      title: '非常好用的应用',
      body: '这个应用真的很棒！界面设计很美观，功能也很实用。希望开发者能继续保持，期待更多新功能！',
      nickname: '快乐用户123',
      createdDate: new Date(),
      responseBody: null,
      responseDate: null
    };

    console.log('   📝 评论内容:', {
      rating: mockReview.rating,
      title: mockReview.title,
      body: mockReview.body.substring(0, 50) + '...',
      nickname: mockReview.nickname
    });

    // 3. 推送评论到飞书
    console.log('3. 推送评论到飞书');
    const pushResponse = await axios.post(`${BASE_URL}/feishu/send-card`, {
      chat_id: 'oc_130c7aece1e0c64c817d4bc764d1b686',
      cardData: {
        config: {
          wide_screen_mode: true
        },
        header: {
          title: {
            tag: 'plain_text',
            content: '📱 App Store 评论 - 新评论'
          },
          template: 'blue'
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `⭐⭐⭐⭐ 4 星\n\n👤 快乐用户123 · ${new Date().toLocaleString('zh-CN')}`
            }
          },
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: '**非常好用的应用**\n\n这个应用真的很棒！界面设计很美观，功能也很实用。希望开发者能继续保持，期待更多新功能！'
            }
          },
          {
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: {
                  tag: 'plain_text',
                  content: '📤 提交回复'
                },
                type: 'primary',
                value: {
                  reviewId: mockReview.id,
                  appId: mockReview.appId,
                  action: 'submit_reply'
                }
              },
              {
                tag: 'button',
                text: {
                  tag: 'plain_text',
                  content: '📊 查看详情'
                },
                type: 'default',
                value: {
                  reviewId: mockReview.id,
                  appId: mockReview.appId,
                  action: 'view_details'
                }
              }
            ]
          }
        ]
      }
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
      console.log('✅ 评论推送成功！');
      console.log('💡 请在飞书群组中查看是否收到了交互式卡片消息');
    } else {
      console.log('❌ 评论推送失败！');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testReviewPush().catch(console.error);
