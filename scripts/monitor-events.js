#!/usr/bin/env node

const axios = require('axios');

async function monitorEvents() {
  console.log('🔍 开始监控飞书事件...\n');
  
  let lastMessageCount = 0;
  let lastHeartbeat = '';
  
  while (true) {
    try {
      // 获取飞书状态
      const status = await axios.get('http://localhost:3000/feishu/status');
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
      
      // 等待3秒
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error('❌ 监控错误:', error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// 启动监控
monitorEvents().catch(console.error);
