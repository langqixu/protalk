#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testLogging() {
  console.log('📝 测试日志功能...\n');

  try {
    // 1. 检查服务状态
    console.log('1. 检查服务状态');
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log(`   ✅ 服务状态: ${health.data.data.status}\n`);

    // 2. 发送一个简单的测试请求
    console.log('2. 发送测试请求');
    const testResponse = await axios.post(`${BASE_URL}/feishu/events`, {
      type: 'url_verification',
      challenge: 'logging_test_123'
    });
    console.log(`   ✅ 测试响应: ${JSON.stringify(testResponse.data)}\n`);

    // 3. 检查日志文件
    console.log('3. 检查日志文件');
    const fs = require('fs');
    const logPath = './logs/combined.log';
    
    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath);
      console.log(`   📁 日志文件存在`);
      console.log(`   📅 最后修改时间: ${stats.mtime.toLocaleString('zh-CN')}`);
      console.log(`   📏 文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      
      // 读取最后几行
      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      const lastLines = lines.slice(-5);
      
      console.log(`   📄 最后5行日志:`);
      lastLines.forEach((line, index) => {
        console.log(`      ${index + 1}. ${line.substring(0, 100)}...`);
      });
    } else {
      console.log(`   ❌ 日志文件不存在`);
    }

    console.log('\n🎉 日志测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testLogging();
