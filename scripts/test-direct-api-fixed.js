#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function testDirectAPI() {
  console.log('🧪 测试修正后的直接API调用\n');

  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  
  if (!appId || !appSecret) {
    console.log('❌ 环境变量未设置');
    return;
  }

  try {
    // 1. 获取访问令牌
    console.log('1. 获取访问令牌...');
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: appId,
      app_secret: appSecret,
    });
    
    const token = tokenResponse.data.tenant_access_token;
    console.log('   ✅ 令牌获取成功');

    // 2. 修正后的消息发送（添加必需字段）
    console.log('2. 发送消息（修正版本）...');
    const chatId = 'oc_130c7aece1e0c64c817d4bc764d1b686';
    
    const messageData = {
      receive_id: chatId,
      receive_id_type: 'chat_id',  // 这个字段是必需的
      msg_type: 'text',
      content: JSON.stringify({ 
        text: `🚀 修正后的直接API测试 - ${new Date().toLocaleString('zh-CN')}\n\n如果你收到这条消息，说明直接API调用成功！` 
      })
    };
    
    console.log('   发送数据:', JSON.stringify(messageData, null, 2));
    
    const messageResponse = await axios.post('https://open.feishu.cn/open-apis/im/v1/messages', messageData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   ✅ API调用成功:', JSON.stringify(messageResponse.data, null, 2));
    
    if (messageResponse.data.code === 0) {
      console.log('\n🎉 消息发送成功！请检查飞书群组是否收到消息。');
      console.log('💡 如果收到了，说明问题在于机器人没有被添加到群组中。');
    } else {
      console.log('\n❌ 消息发送失败:', messageResponse.data.msg);
    }
    
  } catch (error) {
    console.log('   ❌ API调用失败:');
    if (error.response?.data) {
      console.log('   错误详情:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('   错误信息:', error.message);
    }
  }
}

testDirectAPI().catch(console.error);
