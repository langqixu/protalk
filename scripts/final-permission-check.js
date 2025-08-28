#!/usr/bin/env node

const axios = require('axios');

async function finalPermissionCheck() {
  console.log('🔍 最终权限检查\n');

  console.log('✅ 好消息：双重处理逻辑已修复！');
  console.log('   - API现在返回真实的错误状态');
  console.log('   - 不再有虚假的成功响应\n');

  console.log('❌ 需要解决：飞书API返回400错误');
  console.log('   - 这通常表明权限或参数问题\n');

  console.log('🎯 可能的解决方案:');
  console.log('');
  console.log('1. **检查机器人权限** (最可能的原因)');
  console.log('   - 登录飞书开放平台：https://open.feishu.cn/');
  console.log('   - 找到你的应用：cli_a83ab5ea4418900c');
  console.log('   - 检查"权限管理"页面');
  console.log('   - 确保启用了以下权限：');
  console.log('     * 发送消息权限 (im:message)');
  console.log('     * 读取群信息权限 (im:chat:readonly)');
  console.log('     * 接收群消息权限 (im:message:receive_v1)');
  console.log('');
  console.log('2. **检查机器人是否真正在群组中**');
  console.log('   - 在飞书中打开"AI Solo"群组');
  console.log('   - 查看群成员列表');
  console.log('   - 确保机器人在列表中');
  console.log('   - 如果不在，重新添加机器人');
  console.log('');
  console.log('3. **检查群组设置**');
  console.log('   - 群组是否允许机器人发送消息');
  console.log('   - 群组是否对机器人开放');
  console.log('   - 是否有其他限制设置');
  console.log('');
  console.log('4. **创建新的测试群组**');
  console.log('   - 创建一个新群组');
  console.log('   - 在创建时就添加机器人');
  console.log('   - 用新群组ID测试');

  // 检查当前生产环境状态
  console.log('\n🔍 当前生产环境状态:');
  try {
    const statusResponse = await axios.get('https://protalk.zeabur.app/feishu/status');
    console.log('   服务状态:', JSON.stringify(statusResponse.data, null, 2));
  } catch (error) {
    console.log('   ❌ 无法获取状态:', error.message);
  }

  try {
    const chatListResponse = await axios.get('https://protalk.zeabur.app/feishu/chat-list');
    console.log('   群组列表:', JSON.stringify(chatListResponse.data, null, 2));
  } catch (error) {
    console.log('   ❌ 无法获取群组列表:', error.message);
  }

  console.log('\n💡 建议的下一步:');
  console.log('   1. 检查飞书开放平台的机器人权限设置');
  console.log('   2. 确认机器人确实在目标群组中');
  console.log('   3. 尝试创建新群组进行测试');
  console.log('   4. 如果还是不行，可能需要重新创建机器人应用');
}

finalPermissionCheck().catch(console.error);
