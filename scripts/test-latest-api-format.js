#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function testLatestAPIFormat() {
  console.log('🔄 测试最新的飞书API格式\n');

  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  
  try {
    // 获取访问令牌
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: appId,
      app_secret: appSecret,
    });
    
    const token = tokenResponse.data.tenant_access_token;
    console.log('✅ 访问令牌获取成功');

    const chatId = 'oc_130c7aece1e0c64c817d4bc764d1b686';
    const testMessage = '🧪 最新API格式测试 - ' + new Date().toLocaleString('zh-CN');

    // 1. 尝试最新的im/v1/messages格式（严格按官方文档）
    console.log('\n1. 测试最新官方文档格式...');
    try {
      const data = {
        receive_id: chatId,
        receive_id_type: "chat_id", // 使用双引号
        msg_type: "text",
        content: JSON.stringify({
          text: testMessage + ' (官方格式)'
        })
      };
      
      console.log('   请求体:', JSON.stringify(data, null, 2));
      
      const response = await axios({
        method: 'POST',
        url: 'https://open.feishu.cn/open-apis/im/v1/messages',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8'
        },
        data: data
      });
      
      console.log('   ✅ 官方格式成功:', response.data);
    } catch (error) {
      console.log('   ❌ 官方格式失败:', error.response?.data || error.message);
      console.log('   状态码:', error.response?.status);
    }

    // 2. 尝试不同的Content-Type
    console.log('\n2. 测试不同的Content-Type...');
    try {
      const response = await axios.post('https://open.feishu.cn/open-apis/im/v1/messages', {
        receive_id: chatId,
        receive_id_type: "chat_id",
        msg_type: "text",
        content: JSON.stringify({
          text: testMessage + ' (不同Content-Type)'
        })
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8',
          'Accept': 'application/json'
        }
      });
      console.log('   ✅ 不同Content-Type成功:', response.data);
    } catch (error) {
      console.log('   ❌ 不同Content-Type失败:', error.response?.data || error.message);
    }

    // 3. 尝试使用POST form格式
    console.log('\n3. 测试POST form格式...');
    try {
      const params = new URLSearchParams({
        receive_id: chatId,
        receive_id_type: 'chat_id',
        msg_type: 'text',
        content: JSON.stringify({
          text: testMessage + ' (Form格式)'
        })
      });
      
      const response = await axios.post('https://open.feishu.cn/open-apis/im/v1/messages', params, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      console.log('   ✅ Form格式成功:', response.data);
    } catch (error) {
      console.log('   ❌ Form格式失败:', error.response?.data || error.message);
    }

    // 4. 尝试旧版本API（如果有）
    console.log('\n4. 测试是否有旧版本API...');
    try {
      const response = await axios.post('https://open.feishu.cn/open-apis/message/v4/send/', {
        chat_id: chatId,
        msg_type: 'text',
        content: {
          text: testMessage + ' (v4版本)'
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('   ✅ v4版本成功:', response.data);
    } catch (error) {
      console.log('   ❌ v4版本失败:', error.response?.data || error.message);
    }

    // 5. 检查是否有其他消息发送endpoint
    console.log('\n5. 尝试其他可能的endpoint...');
    const endpoints = [
      'https://open.feishu.cn/open-apis/im/v1/messages',
      'https://open.feishu.cn/open-apis/im/v2/messages', 
      'https://open.feishu.cn/open-apis/message/v1/send',
      'https://open.feishu.cn/open-apis/bot/v2/send'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.post(endpoint, {
          receive_id: chatId,
          receive_id_type: "chat_id",
          msg_type: "text",
          content: JSON.stringify({
            text: testMessage + ` (${endpoint.split('/').pop()})`
          })
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        console.log(`   ✅ ${endpoint} 成功:`, response.data);
        break; // 找到能用的就停止
      } catch (error) {
        const status = error.response?.status;
        const msg = error.response?.data?.msg || error.message;
        console.log(`   ❌ ${endpoint} (${status}): ${msg}`);
      }
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }

  console.log('\n💡 分析结论:');
  console.log('   如果所有格式都失败 → 可能是权限或应用配置问题');
  console.log('   如果某个格式成功 → 说明是API调用方式问题');
  console.log('   如果404错误 → 可能是endpoint路径问题');
  console.log('   如果403错误 → 权限问题');
  console.log('   如果400错误 → 参数格式问题');
}

testLatestAPIFormat().catch(console.error);
