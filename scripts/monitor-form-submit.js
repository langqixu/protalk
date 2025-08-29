#!/usr/bin/env node

/**
 * 实时监控表单提交事件
 */

const https = require('https');

console.log('🔍 开始实时监控表单提交事件...\n');
console.log('📱 请现在点击飞书卡片的"提交"按钮！\n');

let lastMessageCount = 0;

function checkForNewEvents() {
  const options = {
    hostname: 'protalk.zeabur.app',
    port: 443,
    path: '/feishu/status',
    method: 'GET'
  };

  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const status = JSON.parse(data);
        const currentMessageCount = status.status.messageCount;
        
        if (currentMessageCount > lastMessageCount) {
          console.log(`🚨 检测到新事件！消息数量: ${lastMessageCount} → ${currentMessageCount}`);
          console.log(`⏰ 时间: ${new Date().toLocaleTimeString()}`);
          lastMessageCount = currentMessageCount;
        } else {
          console.log(`📊 [${new Date().toLocaleTimeString()}] 无新事件 (消息数: ${currentMessageCount})`);
        }
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

// 获取初始状态
checkForNewEvents();

// 每2秒检查一次
const interval = setInterval(checkForNewEvents, 2000);

// 60秒后停止监控
setTimeout(() => {
  clearInterval(interval);
  console.log('\n⏰ 监控结束');
  console.log('\n📋 结果分析:');
  if (lastMessageCount === 0) {
    console.log('❌ 没有检测到任何新事件');
    console.log('🔍 这说明飞书没有发送事件，或者事件没有到达服务器');
    console.log('💡 可能的原因:');
    console.log('   1. 表单提交按钮的配置有问题');
    console.log('   2. 飞书事件订阅配置不完整');
    console.log('   3. 网络连接问题');
  } else {
    console.log('✅ 检测到事件，但可能处理过程中有问题');
  }
  process.exit(0);
}, 60000);

console.log('⏳ 监控60秒，请在此期间点击提交按钮...');
