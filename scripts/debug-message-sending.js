#!/usr/bin/env node

const axios = require('axios');

async function debugMessageSending() {
  console.log('🔍 调试消息发送问题\n');

  try {
    // 1. 验证生产环境的认证和群组
    console.log('1. 验证生产环境认证状态...');
    
    const chatListResponse = await axios.get('https://protalk.zeabur.app/feishu/chat-list');
    console.log('   群组列表:', chatListResponse.data);
    
    const firstChatResponse = await axios.get('https://protalk.zeabur.app/feishu/first-chat-id');
    console.log('   第一个群组:', firstChatResponse.data);

    // 2. 检查群组信息
    console.log('\n2. 检查目标群组信息...');
    const chatId = 'oc_130c7aece1e0c64c817d4bc764d1b686';
    
    try {
      const chatInfoResponse = await axios.get(`https://protalk.zeabur.app/feishu/chat-info?chat_id=${chatId}`);
      console.log('   群组信息:', JSON.stringify(chatInfoResponse.data, null, 2));
    } catch (error) {
      console.log('   ❌ 无法获取群组信息:', error.response?.data || error.message);
    }

    // 3. 检查群组成员
    console.log('\n3. 检查群组成员...');
    try {
      const membersResponse = await axios.get(`https://protalk.zeabur.app/feishu/member-list?chat_id=${chatId}`);
      console.log('   群组成员:', JSON.stringify(membersResponse.data, null, 2));
    } catch (error) {
      console.log('   ❌ 无法获取群组成员:', error.response?.data || error.message);
    }

    // 4. 尝试不同方式发送消息
    console.log('\n4. 尝试不同方式发送消息...');
    
    // 方式1: 使用 send-message
    console.log('   方式1: 通过 send-message API...');
    try {
      const response1 = await axios.post('https://protalk.zeabur.app/feishu/send-message', {
        content: `🧪 调试测试1 - send-message - ${new Date().toLocaleString('zh-CN')}`
      });
      console.log('   ✅ send-message 响应:', response1.data);
    } catch (error) {
      console.log('   ❌ send-message 失败:', error.response?.data || error.message);
    }

    // 方式2: 使用 send-to
    console.log('   方式2: 通过 send-to API...');
    try {
      const response2 = await axios.post('https://protalk.zeabur.app/feishu/send-to', {
        chat_id: chatId,
        content: `🧪 调试测试2 - send-to - ${new Date().toLocaleString('zh-CN')}`
      });
      console.log('   ✅ send-to 响应:', response2.data);
    } catch (error) {
      console.log('   ❌ send-to 失败:', error.response?.data || error.message);
    }

    // 方式3: 使用 send-card
    console.log('   方式3: 通过 send-card API...');
    try {
      const cardData = {
        config: {
          wide_screen_mode: true
        },
        header: {
          title: {
            tag: 'plain_text',
            content: '🧪 调试卡片测试'
          },
          template: 'blue'
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `调试卡片消息 - ${new Date().toLocaleString('zh-CN')}`
            }
          }
        ]
      };

      const response3 = await axios.post('https://protalk.zeabur.app/feishu/send-card', {
        chat_id: chatId,
        cardData: cardData
      });
      console.log('   ✅ send-card 响应:', response3.data);
    } catch (error) {
      console.log('   ❌ send-card 失败:', error.response?.data || error.message);
    }

    // 5. 本地直接测试飞书API
    console.log('\n5. 本地直接测试飞书API...');
    await testDirectFeishuAPI();

  } catch (error) {
    console.error('❌ 调试失败:', error.message);
  }
}

async function testDirectFeishuAPI() {
  require('dotenv').config();
  
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  
  if (!appId || !appSecret) {
    console.log('   ❌ 本地环境变量未设置');
    return;
  }

  try {
    // 获取访问令牌
    console.log('   📡 获取访问令牌...');
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: appId,
      app_secret: appSecret,
    });
    
    const token = tokenResponse.data.tenant_access_token;
    console.log('   ✅ 令牌获取成功:', token.substring(0, 20) + '...');

    // 直接发送消息到飞书
    console.log('   📡 直接发送消息到飞书...');
    const chatId = 'oc_130c7aece1e0c64c817d4bc764d1b686';
    
    const messageResponse = await axios.post('https://open.feishu.cn/open-apis/im/v1/messages', {
      receive_id: chatId,
      receive_id_type: 'chat_id',
      msg_type: 'text',
      content: JSON.stringify({ 
        text: `🚀 本地直接API调用测试 - ${new Date().toLocaleString('zh-CN')}` 
      })
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   ✅ 直接API调用成功:', JSON.stringify(messageResponse.data, null, 2));
    console.log('   📱 如果你收到了这条消息，说明问题在应用层面');
    
  } catch (error) {
    console.log('   ❌ 直接API调用失败:', error.response?.data || error.message);
  }
}

// 运行调试
debugMessageSending().catch(console.error);
