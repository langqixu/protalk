#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function tryDifferentFormats() {
  console.log('🔄 尝试不同的API格式和版本\n');

  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  
  try {
    // 获取访问令牌
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: appId,
      app_secret: appSecret,
    });
    
    const token = tokenResponse.data.tenant_access_token;
    console.log('✅ 访问令牌获取成功\n');

    const chatId = 'oc_130c7aece1e0c64c817d4bc764d1b686';
    const testMessage = '🧪 API格式测试 - ' + new Date().toLocaleString('zh-CN');

    // 1. 尝试标准格式
    console.log('1. 尝试标准格式...');
    try {
      const response1 = await axios.post('https://open.feishu.cn/open-apis/im/v1/messages', {
        receive_id: chatId,
        receive_id_type: 'chat_id',
        msg_type: 'text',
        content: JSON.stringify({ text: testMessage + ' (标准格式)' })
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('   ✅ 标准格式成功:', response1.data);
    } catch (error) {
      console.log('   ❌ 标准格式失败:', error.response?.data?.msg || error.message);
    }

    // 2. 尝试不同的content格式
    console.log('\n2. 尝试不同的content格式...');
    try {
      const response2 = await axios.post('https://open.feishu.cn/open-apis/im/v1/messages', {
        receive_id: chatId,
        receive_id_type: 'chat_id',
        msg_type: 'text',
        content: { text: testMessage + ' (对象格式)' } // 不用JSON.stringify
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('   ✅ 对象格式成功:', response2.data);
    } catch (error) {
      console.log('   ❌ 对象格式失败:', error.response?.data?.msg || error.message);
    }

    // 3. 尝试使用user_id而不是chat_id (发送给你自己)
    console.log('\n3. 尝试发送私聊消息...');
    try {
      const userOpenId = 'ou_d925222d1052654eefac8aebf1009f12';
      const response3 = await axios.post('https://open.feishu.cn/open-apis/im/v1/messages', {
        receive_id: userOpenId,
        receive_id_type: 'open_id',
        msg_type: 'text',
        content: JSON.stringify({ text: testMessage + ' (私聊)' })
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('   ✅ 私聊成功:', response3.data);
      console.log('   💡 如果你收到私聊消息，说明机器人本身正常，问题在群组');
    } catch (error) {
      console.log('   ❌ 私聊失败:', error.response?.data?.msg || error.message);
    }

    // 4. 尝试批量接口
    console.log('\n4. 尝试批量发送接口...');
    try {
      const response4 = await axios.post('https://open.feishu.cn/open-apis/im/v1/batch_messages', {
        receive_id_type: 'chat_id',
        msg_type: 'text',
        content: JSON.stringify({ text: testMessage + ' (批量)' }),
        receive_ids: [chatId]
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('   ✅ 批量发送成功:', response4.data);
    } catch (error) {
      console.log('   ❌ 批量发送失败:', error.response?.data?.msg || error.message);
    }

    // 5. 检查机器人能力
    console.log('\n5. 检查机器人能力...');
    try {
      const capabilityResponse = await axios.get('https://open.feishu.cn/open-apis/bot/v3/info', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('   ✅ 机器人信息:', JSON.stringify(capabilityResponse.data, null, 2));
    } catch (error) {
      console.log('   ❌ 机器人信息获取失败:', error.response?.data?.msg || error.message);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }

  console.log('\n💡 测试结果分析:');
  console.log('   如果私聊成功但群聊失败 → 群组权限问题');
  console.log('   如果对象格式成功 → content序列化问题');
  console.log('   如果批量接口成功 → 单条消息接口问题');
  console.log('   如果都失败 → 机器人配置根本问题');
}

tryDifferentFormats().catch(console.error);
