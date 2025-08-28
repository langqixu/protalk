#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function deepDebugPermissions() {
  console.log('🔍 深度调试权限和逻辑冲突\n');

  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  
  console.log('📋 分析矛盾现象:');
  console.log('   ✅ 能获取群组列表和信息 = 机器人有读取权限');
  console.log('   ❌ 无法发送消息 = 机器人可能没有发送权限');
  console.log('   🤔 这说明权限配置不完整\n');

  try {
    // 1. 获取访问令牌
    console.log('1. 获取访问令牌和应用信息...');
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

    // 2. 获取应用信息
    console.log('2. 获取应用详细信息...');
    try {
      const appInfoResponse = await httpClient.get('/application/v6/applications/self', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('   应用信息:', JSON.stringify(appInfoResponse.data, null, 2));
    } catch (error) {
      console.log('   ❌ 无法获取应用信息:', error.response?.data || error.message);
    }

    // 3. 检查机器人在群组中的状态
    console.log('3. 检查机器人在群组中的状态...');
    const chatId = 'oc_130c7aece1e0c64c817d4bc764d1b686';
    
    try {
      // 尝试获取机器人在群组中的信息
      const botInChatResponse = await httpClient.get(`/im/v1/chats/${chatId}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          member_id_type: 'app_id',
          page_size: 100
        }
      });
      
      console.log('   群组中的所有成员:', JSON.stringify(botInChatResponse.data, null, 2));
      
      // 检查机器人是否在成员列表中
      const members = botInChatResponse.data.data?.items || [];
      const botMember = members.find(member => 
        member.member_id === appId || 
        member.name?.includes('Protalk') || 
        member.member_id_type === 'app_id'
      );
      
      if (botMember) {
        console.log('   ✅ 找到机器人在群组中:', botMember);
      } else {
        console.log('   ❌ 机器人不在群组成员列表中');
        console.log('   💡 这解释了为什么无法发送消息！');
      }
      
    } catch (error) {
      console.log('   ❌ 检查失败:', error.response?.data || error.message);
    }

    // 4. 测试不同的消息发送方式
    console.log('4. 测试不同的消息发送方式...');
    
    // 尝试发送到用户而不是群组
    console.log('   尝试发送到用户 open_id...');
    const userOpenId = 'ou_d925222d1052654eefac8aebf1009f12'; // 你的 open_id
    
    try {
      const userMessageResponse = await httpClient.post('/im/v1/messages', {
        receive_id: userOpenId,
        receive_id_type: 'open_id',
        msg_type: 'text',
        content: JSON.stringify({ 
          text: `🔧 测试发送到用户 - ${new Date().toLocaleString('zh-CN')}` 
        })
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('   ✅ 发送到用户成功:', userMessageResponse.data);
      console.log('   💡 如果你收到私聊消息，说明机器人本身工作正常');
      
    } catch (error) {
      console.log('   ❌ 发送到用户失败:', error.response?.data || error.message);
    }

    // 5. 检查是否有两套逻辑冲突
    console.log('\n5. 检查生产环境API状态...');
    
    try {
      const prodStatusResponse = await axios.get('https://protalk.zeabur.app/feishu/status');
      console.log('   生产环境状态:', JSON.stringify(prodStatusResponse.data, null, 2));
      
      // 检查是否还有webhook相关配置
      const status = prodStatusResponse.data.data;
      if (status.mode?.currentMode === 'webhook' && status.connection?.messageCount === 0) {
        console.log('   ⚠️  发现问题：模式是webhook但消息计数为0');
        console.log('   💡 这可能表明webhook模式没有正确处理消息');
      }
      
    } catch (error) {
      console.log('   ❌ 无法获取生产环境状态:', error.message);
    }

  } catch (error) {
    console.error('❌ 调试失败:', error.message);
  }

  console.log('\n📝 诊断总结:');
  console.log('   1. 检查机器人是否真的在群组中');
  console.log('   2. 检查机器人的消息发送权限');
  console.log('   3. 检查是否有两套逻辑冲突');
  console.log('   4. 验证群组设置是否正确');
}

deepDebugPermissions().catch(console.error);
