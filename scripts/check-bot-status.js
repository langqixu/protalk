#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function checkBotStatus() {
  console.log('🤖 检查机器人状态和配置\n');

  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  
  console.log('📋 关键发现分析:');
  console.log('   ✅ 机器人在群组中 (bot_count: 1)');
  console.log('   ❌ 私聊和群聊都失败');
  console.log('   🤔 说明问题在机器人应用本身\n');

  try {
    // 1. 获取访问令牌
    console.log('1. 测试访问令牌获取...');
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: appId,
      app_secret: appSecret,
    });
    
    const token = tokenResponse.data.tenant_access_token;
    console.log('   ✅ 访问令牌获取成功');
    console.log('   令牌前缀:', token.substring(0, 20) + '...');

    // 2. 获取应用信息 - 检查应用状态
    console.log('\n2. 检查应用状态...');
    try {
      const appInfoResponse = await axios.get('https://open.feishu.cn/open-apis/application/v6/applications/self', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const appInfo = appInfoResponse.data.data;
      console.log('   ✅ 应用信息获取成功');
      console.log('   应用ID:', appInfo.app_id);
      console.log('   应用名称:', appInfo.app_name);
      console.log('   应用状态:', appInfo.status);
      console.log('   应用类型:', appInfo.app_type);
      
      if (appInfo.status !== 'active') {
        console.log('   ⚠️  应用状态不是active，这可能是问题原因！');
      }
      
    } catch (error) {
      console.log('   ❌ 无法获取应用信息:', error.response?.data?.msg || error.message);
      
      if (error.response?.data?.code) {
        console.log('   错误码:', error.response.data.code);
        console.log('   这可能表明权限配置问题');
      }
    }

    // 3. 测试最简单的API调用
    console.log('\n3. 测试最基础的消息发送API...');
    
    const chatId = 'oc_130c7aece1e0c64c817d4bc764d1b686';
    const messageData = {
      receive_id: chatId,
      receive_id_type: 'chat_id',
      msg_type: 'text',
      content: JSON.stringify({
        text: '🧪 直接API测试 - ' + new Date().toLocaleString('zh-CN')
      })
    };
    
    console.log('   请求数据:', JSON.stringify(messageData, null, 2));
    
    try {
      const messageResponse = await axios.post('https://open.feishu.cn/open-apis/im/v1/messages', messageData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
      
      console.log('   ✅ 直接API调用成功!');
      console.log('   响应:', JSON.stringify(messageResponse.data, null, 2));
      console.log('   🎉 如果你收到消息，说明问题在应用层面的封装');
      
    } catch (error) {
      console.log('   ❌ 直接API调用失败:');
      console.log('   状态码:', error.response?.status);
      console.log('   错误详情:', JSON.stringify(error.response?.data, null, 2));
      
      const errorCode = error.response?.data?.code;
      if (errorCode) {
        console.log('\n   📚 错误代码分析:');
        switch (errorCode) {
          case 99991668:
            console.log('   → 机器人没有权限发送消息到该群组');
            break;
          case 99991400:
            console.log('   → 应用未获得足够权限');
            break;
          case 99992402:
            console.log('   → 字段验证失败，检查请求参数');
            break;
          case 99991661:
            console.log('   → 机器人不在该群组中');
            break;
          default:
            console.log('   → 未知错误，建议查看飞书开发文档');
        }
      }
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }

  console.log('\n🔧 下一步建议:');
  console.log('   1. 如果应用状态不是active → 发布应用');
  console.log('   2. 如果直接API成功 → 问题在应用封装代码');
  console.log('   3. 如果直接API失败 → 检查权限配置和应用发布状态');
  console.log('   4. 创建新的公开群组进行测试');
}

checkBotStatus().catch(console.error);
