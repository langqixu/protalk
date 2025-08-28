#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function checkActivationStatus() {
  console.log('🤖 检查机器人激活状态\n');

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

    // 获取机器人详细信息
    const botInfoResponse = await axios.get('https://open.feishu.cn/open-apis/bot/v3/info', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const botInfo = botInfoResponse.data.bot;
    console.log('🤖 机器人详细信息:');
    console.log('   应用名称:', botInfo.app_name);
    console.log('   激活状态:', botInfo.activate_status);
    console.log('   Open ID:', botInfo.open_id);
    console.log('   头像URL:', botInfo.avatar_url ? '已设置' : '未设置');
    console.log('   IP白名单:', botInfo.ip_white_list?.length || 0, '条规则');

    // 分析激活状态
    console.log('\n📊 激活状态分析:');
    switch (botInfo.activate_status) {
      case 0:
        console.log('   ✅ 状态0: 机器人已激活并可正常使用');
        break;
      case 1:
        console.log('   ⚠️  状态1: 机器人部分激活或有限制');
        break;
      case 2:
        console.log('   ❌ 状态2: 机器人未激活或被禁用');
        console.log('   💡 这很可能是消息发送失败的原因！');
        break;
      case 3:
        console.log('   ⛔ 状态3: 机器人被暂停或审核中');
        break;
      default:
        console.log('   ❓ 未知状态:', botInfo.activate_status);
    }

    if (botInfo.activate_status !== 0) {
      console.log('\n🔧 激活状态问题解决方案:');
      console.log('   1. 登录飞书开放平台 https://open.feishu.cn/');
      console.log('   2. 找到应用:', appId);
      console.log('   3. 检查"应用发布"页面');
      console.log('   4. 确保应用已发布并启用');
      console.log('   5. 检查是否需要通过审核');
      console.log('   6. 如果是企业内部应用，确保已正确部署');
    }

    // 尝试其他API测试
    console.log('\n🧪 尝试其他API测试...');
    
    // 测试获取群组列表（这个之前成功过）
    try {
      const chatsResponse = await axios.get('https://open.feishu.cn/open-apis/im/v1/chats', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          page_size: 10
        }
      });
      console.log('   ✅ 群组列表API正常工作');
      console.log('   📊 群组数量:', chatsResponse.data.data?.items?.length || 0);
    } catch (error) {
      console.log('   ❌ 群组列表API失败:', error.response?.data?.msg || error.message);
    }

    // 测试应用信息API
    try {
      const appResponse = await axios.get('https://open.feishu.cn/open-apis/application/v6/applications/self', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('   ✅ 应用信息API正常工作');
      console.log('   📱 应用状态:', appResponse.data.data?.status);
    } catch (error) {
      console.log('   ❌ 应用信息API失败:', error.response?.data?.msg || error.message);
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }

  console.log('\n💡 总结:');
  console.log('   如果activate_status不是0，需要激活/发布机器人应用');
  console.log('   如果其他API正常但消息API失败，说明权限配置问题');
  console.log('   建议检查飞书开放平台的应用发布状态');
}

checkActivationStatus().catch(console.error);
