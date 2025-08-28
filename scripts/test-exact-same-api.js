#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function testExactSameAPI() {
  console.log('🔧 测试与FeishuBot完全相同的API调用\n');

  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  
  if (!appId || !appSecret) {
    console.log('❌ 环境变量未设置');
    return;
  }

  try {
    // 1. 获取访问令牌（完全模拟FeishuBot的方式）
    console.log('1. 获取访问令牌（模拟FeishuBot）...');
    
    const httpClient = axios.create({
      baseURL: 'https://open.feishu.cn/open-apis',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const tokenResponse = await httpClient.post('/auth/v3/tenant_access_token/internal', {
      app_id: appId,
      app_secret: appSecret,
    });
    
    const token = tokenResponse.data.tenant_access_token;
    console.log('   ✅ 令牌获取成功');

    // 2. 发送消息（完全按照FeishuBot的方式）
    console.log('2. 发送消息（完全模拟FeishuBot）...');
    const chatId = 'oc_130c7aece1e0c64c817d4bc764d1b686';
    const content = `🎯 完全模拟FeishuBot的API调用 - ${new Date().toLocaleString('zh-CN')}`;
    
    // 这里使用与FeishuBot完全相同的参数和格式
    const resp = await httpClient.post('/im/v1/messages', {
      receive_id: chatId,
      receive_id_type: 'chat_id',
      msg_type: 'text',
      content: JSON.stringify({ text: content })
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('   ✅ API调用成功:', JSON.stringify(resp.data, null, 2));
    
    if (resp.data.code === 0) {
      console.log('\n🎉 完全模拟的API调用成功！');
      console.log('💡 如果你收到这条消息，说明问题已经解决！');
    } else {
      console.log('\n❌ API返回错误:', resp.data.msg);
    }
    
  } catch (error) {
    console.log('   ❌ API调用失败:');
    if (error.response?.data) {
      console.log('   错误详情:', JSON.stringify(error.response.data, null, 2));
      
      // 如果是权限问题，给出具体建议
      if (error.response.data.code === 99991668) {
        console.log('\n💡 权限错误建议:');
        console.log('   1. 确保机器人已被添加到目标群组');
        console.log('   2. 确保机器人有发送消息的权限');
        console.log('   3. 检查群组设置是否允许机器人发送消息');
      }
    } else {
      console.log('   错误信息:', error.message);
    }
  }
}

testExactSameAPI().catch(console.error);
