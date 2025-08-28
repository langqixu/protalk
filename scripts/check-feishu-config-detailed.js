#!/usr/bin/env node
require('dotenv').config();

console.log('🔍 飞书配置详细检查\n');

console.log('1. 环境变量检查:');
const feishuVars = [
  'FEISHU_APP_ID',
  'FEISHU_APP_SECRET', 
  'FEISHU_VERIFICATION_TOKEN',
  'FEISHU_ENCRYPT_KEY',
  'FEISHU_MODE'
];

feishuVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`   ✅ ${varName}: ${varName.includes('SECRET') || varName.includes('TOKEN') || varName.includes('KEY') ? '***已设置***' : value}`);
  } else {
    console.log(`   ❌ ${varName}: 未设置`);
  }
});

console.log('\n2. 飞书机器人认证测试:');
const axios = require('axios');

async function testFeishuAuth() {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  
  if (!appId || !appSecret) {
    console.log('   ❌ APP_ID 或 APP_SECRET 未设置，无法测试认证');
    return;
  }
  
  try {
    console.log('   📡 正在获取访问令牌...');
    const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: appId,
      app_secret: appSecret,
    }, {
      timeout: 10000
    });
    
    console.log(`   ✅ 访问令牌获取成功: ${response.data.tenant_access_token?.substring(0, 20)}...`);
    console.log(`   ⏰ 过期时间: ${response.data.expire} 秒`);
    
    // 测试获取群组列表
    console.log('   📡 正在测试群组列表API...');
    const token = response.data.tenant_access_token;
    const chatResponse = await axios.get('https://open.feishu.cn/open-apis/im/v1/chats', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        page_size: 100
      },
      timeout: 10000
    });
    
    console.log(`   ✅ 群组列表获取成功`);
    console.log(`   📊 总数: ${chatResponse.data.data.total}`);
    console.log(`   📋 当前页数量: ${chatResponse.data.data.items?.length || 0}`);
    
    if (chatResponse.data.data.items?.length > 0) {
      console.log('   📱 群组列表:');
      chatResponse.data.data.items.slice(0, 3).forEach((chat, index) => {
        console.log(`      ${index + 1}. ID: ${chat.chat_id}, 名称: ${chat.name || '无名称'}, 类型: ${chat.chat_type}`);
      });
    } else {
      console.log('   ⚠️  未找到任何群组 - 请确保机器人已被添加到群组中');
    }
    
  } catch (error) {
    console.log('   ❌ 认证测试失败:', error.message);
    if (error.response?.data) {
      console.log('   📄 错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function testDirectMessage() {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  
  if (!appId || !appSecret) {
    console.log('   ❌ APP_ID 或 APP_SECRET 未设置，跳过直接消息测试');
    return;
  }
  
  console.log('   📡 正在测试直接消息发送...');
  try {
    // 获取访问令牌
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: appId,
      app_secret: appSecret,
    });
    
    const token = tokenResponse.data.tenant_access_token;
    
    // 获取群组列表
    const chatResponse = await axios.get('https://open.feishu.cn/open-apis/im/v1/chats', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        page_size: 10
      }
    });
    
    if (chatResponse.data.data.items?.length > 0) {
      const firstChatId = chatResponse.data.data.items[0].chat_id;
      
      // 发送测试消息
      const messageResponse = await axios.post('https://open.feishu.cn/open-apis/im/v1/messages', {
        receive_id: firstChatId,
        receive_id_type: 'chat_id',
        msg_type: 'text',
        content: JSON.stringify({ 
          text: '🧪 应用机器人直接消息测试 - ' + new Date().toLocaleString('zh-CN') 
        })
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('   ✅ 直接消息发送成功');
      console.log('   📄 消息ID:', messageResponse.data.data?.message_id);
    } else {
      console.log('   ⚠️  没有找到群组，无法发送测试消息');
    }
    
  } catch (error) {
    console.log('   ❌ 直接消息测试失败:', error.message);
    if (error.response?.data) {
      console.log('   📄 错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function main() {
  await testFeishuAuth();
  
  console.log('\n3. 直接消息测试:');
  await testDirectMessage();
  
  console.log('\n4. 建议修复步骤:');
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  
  if (!appId || !appSecret) {
    console.log('   1️⃣ 设置飞书机器人的APP_ID和APP_SECRET');
    console.log('   2️⃣ 确保机器人已在飞书开放平台正确配置');
    console.log('   3️⃣ 将机器人添加到目标群组中');
  } else {
    console.log('   1️⃣ 检查机器人权限：确保已启用"获取群列表"权限');
    console.log('   2️⃣ 将机器人添加到至少一个群组中');
    console.log('   3️⃣ 重新部署应用以刷新配置');
  }
}

main().catch(console.error);
