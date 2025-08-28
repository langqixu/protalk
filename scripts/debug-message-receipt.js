#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'https://2f7cfc2a4732.ngrok-free.app';

async function debugMessageReceipt() {
  console.log('🔍 调试消息接收功能...\n');

  try {
    // 1. 检查服务状态
    console.log('1. 检查服务状态');
    const statusResponse = await axios.get(`${BASE_URL}/feishu/status`);
    const currentMessageCount = statusResponse.data.data.connection.messageCount;
    console.log(`   📊 当前消息计数: ${currentMessageCount}\n`);

    // 2. 发送测试消息
    console.log('2. 发送测试消息');
    const testMessage = {
      type: 'event_callback',
      event: {
        type: 'im.message.receive_v1',
        message: {
          message_id: `debug_msg_${Date.now()}`,
          chat_id: 'debug_chat_001',
          content: '这是一条调试消息',
          sender: {
            sender_id: 'debug_user_001',
            sender_type: 'user'
          },
          create_time: new Date().toISOString()
        }
      }
    };

    console.log('   📤 发送消息内容:', JSON.stringify(testMessage, null, 2));
    
    const messageResponse = await axios.post(`${BASE_URL}/feishu/events`, testMessage);
    console.log(`   ✅ 消息发送响应: ${JSON.stringify(messageResponse.data)}\n`);

    // 3. 等待处理
    console.log('3. 等待消息处理...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 4. 再次检查服务状态
    console.log('4. 检查处理后的状态');
    const newStatusResponse = await axios.get(`${BASE_URL}/feishu/status`);
    const newMessageCount = newStatusResponse.data.data.connection.messageCount;
    console.log(`   📊 新的消息计数: ${newMessageCount}`);
    console.log(`   📈 消息计数变化: ${newMessageCount - currentMessageCount}\n`);

    // 5. 检查日志文件
    console.log('5. 检查日志文件');
    const fs = require('fs');
    const logPath = './logs/combined.log';
    
    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath);
      console.log(`   📁 日志文件大小: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`   🕒 最后修改时间: ${stats.mtime.toLocaleString()}`);
      
      // 读取最后几行日志
      const logContent = fs.readFileSync(logPath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());
      const lastLines = lines.slice(-5);
      
      console.log('   📝 最后5行日志:');
      lastLines.forEach((line, index) => {
        console.log(`      ${index + 1}. ${line.substring(0, 100)}...`);
      });
    } else {
      console.log('   ❌ 日志文件不存在');
    }
    console.log();

    // 6. 测试健康检查
    console.log('6. 测试健康检查');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log(`   ✅ 健康状态: ${healthResponse.data.data.status}\n`);

    // 7. 分析结果
    console.log('7. 分析结果');
    if (newMessageCount > currentMessageCount) {
      console.log('   ✅ 消息接收正常 - 消息计数已增加');
    } else {
      console.log('   ⚠️  消息接收可能有问题 - 消息计数未增加');
      console.log('   💡 可能的原因:');
      console.log('      - 消息处理逻辑有问题');
      console.log('      - 日志级别设置过高');
      console.log('      - 事件处理失败');
    }

    console.log('\n🎯 建议:');
    console.log('1. 检查飞书开发者后台的事件订阅配置');
    console.log('2. 确认 webhook URL 是否正确');
    console.log('3. 检查机器人权限设置');
    console.log('4. 查看服务器控制台输出');

  } catch (error) {
    console.error('❌ 调试失败:', error.response?.data || error.message);
  }
}

// 运行调试
debugMessageReceipt();
