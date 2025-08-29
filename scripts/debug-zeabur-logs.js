#!/usr/bin/env node

/**
 * 监控 Zeabur 日志的脚本
 */

const https = require('https');

console.log('🔍 开始监控 Zeabur 事件处理...\n');

function checkEventProcessing() {
  const options = {
    hostname: 'protalk.zeabur.app',
    port: 443,
    path: '/feishu/status',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const status = JSON.parse(data);
        console.log(`📊 服务状态 [${new Date().toLocaleTimeString()}]:`, {
          运行时间: Math.floor(status.status.uptime) + '秒',
          消息数量: status.status.messageCount,
          API版本: status.status.apiVersion,
          模式: status.status.mode
        });
      } catch (error) {
        console.log('❌ 状态解析失败:', error.message);
      }
    });
  });

  req.on('error', (e) => {
    console.log('❌ 连接失败:', e.message);
  });

  req.end();
}

console.log('📱 请在飞书中点击提交按钮，然后观察日志输出...\n');

// 每5秒检查一次服务状态
setInterval(checkEventProcessing, 5000);

// 立即检查一次
checkEventProcessing();

// 30秒后自动退出
setTimeout(() => {
  console.log('\n⏰ 监控结束');
  process.exit(0);
}, 30000);
