#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'https://2f7cfc2a4732.ngrok-free.app';

async function quickStatusCheck() {
  console.log('🔍 快速状态检查...\n');

  try {
    // 1. 健康检查
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log(`✅ 服务健康: ${health.data.data.status}`);

    // 2. 飞书服务状态
    const status = await axios.get(`${BASE_URL}/feishu/status`);
    console.log(`✅ 飞书模式: ${status.data.data.mode.currentMode}`);
    console.log(`✅ 连接状态: ${status.data.data.connection.connected ? '已连接' : '未连接'}`);
    console.log(`📊 消息计数: ${status.data.data.connection.messageCount}`);

    // 3. ngrok 状态
    const ngrok = await axios.get('http://localhost:4040/api/tunnels');
    console.log(`✅ ngrok 地址: ${ngrok.data.tunnels[0].public_url}`);

    console.log('\n🎯 当前状态: 所有服务正常运行');
    console.log('📝 请在飞书群组中发送消息进行测试');

  } catch (error) {
    console.error('❌ 状态检查失败:', error.message);
  }
}

quickStatusCheck();
