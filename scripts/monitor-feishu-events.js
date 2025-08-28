#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const PUBLIC_URL = 'https://c7990cee5223.ngrok-free.app';

async function monitorFeishuEvents() {
  console.log('🔍 开始监控飞书事件...\n');
  
  let lastMessageCount = 0;
  let lastHeartbeat = '';
  
  while (true) {
    try {
      // 获取飞书状态
      const status = await axios.get(`${BASE_URL}/feishu/status`);
      const data = status.data.data;
      
      const currentMessageCount = data.connection.messageCount;
      const currentHeartbeat = data.connection.lastHeartbeat;
      const isConnected = data.connection.connected;
      
      // 检查是否有新消息
      if (currentMessageCount > lastMessageCount) {
        const newMessages = currentMessageCount - lastMessageCount;
        console.log(`📨 收到 ${newMessages} 条新消息 (总计: ${currentMessageCount})`);
        console.log(`   🔗 连接状态: ${isConnected ? '✅ 正常' : '❌ 异常'}`);
        console.log(`   ⏰ 最后心跳: ${new Date(currentHeartbeat).toLocaleString('zh-CN')}`);
        console.log('');
      }
      
      // 检查心跳更新
      if (currentHeartbeat !== lastHeartbeat) {
        console.log(`💓 心跳更新: ${new Date(currentHeartbeat).toLocaleString('zh-CN')}`);
      }
      
      lastMessageCount = currentMessageCount;
      lastHeartbeat = currentHeartbeat;
      
      // 等待5秒
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.error('❌ 监控错误:', error.message);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

// 启动监控
monitorFeishuEvents().catch(console.error);
