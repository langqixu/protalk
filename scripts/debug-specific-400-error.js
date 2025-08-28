#!/usr/bin/env node

const axios = require('axios');

async function debug400Error() {
  console.log('🔍 调试具体的400错误信息\n');
  
  console.log('✅ 权限配置确认:');
  console.log('   - im:message:send_as_bot ✓');
  console.log('   - im:message.group_at_msg:readonly ✓');
  console.log('   - im.message.receive_v1 ✓\n');

  // 1. 测试生产环境API，获取详细错误
  console.log('1. 测试生产环境API，获取详细错误...');
  try {
    const response = await axios.post('https://protalk.zeabur.app/feishu/send-message', {
      content: '🧪 权限配置后的测试消息'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('   ✅ 意外成功:', response.data);
  } catch (error) {
    console.log('   ❌ API失败:', error.response?.data || error.message);
    console.log('   状态码:', error.response?.status);
    console.log('   响应头:', error.response?.headers);
  }

  // 2. 检查生产环境日志或者详细状态
  console.log('\n2. 检查服务详细状态...');
  try {
    const statusResponse = await axios.get('https://protalk.zeabur.app/feishu/status');
    console.log('   服务状态:', JSON.stringify(statusResponse.data, null, 2));
  } catch (error) {
    console.log('   ❌ 状态检查失败:', error.message);
  }

  // 3. 直接测试群组信息获取
  console.log('\n3. 测试群组信息获取...');
  try {
    const chatId = 'oc_130c7aece1e0c64c817d4bc764d1b686';
    const chatInfoResponse = await axios.get(`https://protalk.zeabur.app/feishu/chat-info?chat_id=${chatId}`);
    console.log('   ✅ 群组信息获取成功');
    
    const chatInfo = chatInfoResponse.data.data?.data;
    if (chatInfo) {
      console.log('   群组名称:', chatInfo.name);
      console.log('   群组类型:', chatInfo.chat_type);
      console.log('   群组状态:', chatInfo.chat_status);
      console.log('   机器人数量:', chatInfo.bot_count);
      console.log('   用户数量:', chatInfo.user_count);
      
      // 检查群组设置
      if (chatInfo.chat_type === 'private') {
        console.log('   ⚠️  这是私有群组，可能需要特殊权限');
      }
      
      if (chatInfo.restricted_mode_setting?.status) {
        console.log('   ⚠️  群组开启了限制模式');
        console.log('   消息权限设置:', chatInfo.restricted_mode_setting.message_has_permission_setting);
      }
    }
  } catch (error) {
    console.log('   ❌ 群组信息获取失败:', error.response?.data || error.message);
  }

  // 4. 尝试发送到自己的私聊
  console.log('\n4. 尝试发送私聊消息（绕过群组问题）...');
  try {
    const userOpenId = 'ou_d925222d1052654eefac8aebf1009f12'; // 你的 open_id
    const directResponse = await axios.post('https://protalk.zeabur.app/feishu/send-to', {
      chat_id: userOpenId,
      content: '🧪 私聊测试消息 - 如果收到说明机器人本身工作正常'
    });
    console.log('   ✅ 私聊发送成功:', directResponse.data);
    console.log('   💡 如果你收到私聊消息，说明问题在群组配置');
  } catch (error) {
    console.log('   ❌ 私聊发送失败:', error.response?.data || error.message);
  }

  console.log('\n💡 调试结果分析:');
  console.log('   如果私聊成功但群组失败 → 群组权限或配置问题');
  console.log('   如果都失败 → 机器人应用配置问题');
  console.log('   如果群组是私有的 → 可能需要群主权限或特殊配置');
  
  console.log('\n🔧 可能的解决方案:');
  console.log('   1. 检查机器人是否有群组消息发送权限');
  console.log('   2. 尝试在群组中@机器人，看是否能收到事件');
  console.log('   3. 检查群组的机器人设置');
  console.log('   4. 创建一个新的公开群组进行测试');
}

debug400Error().catch(console.error);
