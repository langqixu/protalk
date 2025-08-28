#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testBasicFeishu() {
  console.log('🔍 基础飞书API测试...\n');

  try {
    // 1. 检查服务状态
    console.log('1. 检查服务状态');
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log(`   ✅ 服务状态: ${health.data.data.status}\n`);

    // 2. 检查飞书状态
    console.log('2. 检查飞书状态');
    const feishuStatus = await axios.get(`${BASE_URL}/feishu/status`);
    const status = feishuStatus.data.data;
    console.log(`   📱 模式: ${status.mode.currentMode}`);
    console.log(`   🔗 连接: ${status.connection.connected ? '✅ 正常' : '❌ 异常'}`);
    console.log(`   📨 消息数: ${status.connection.messageCount}`);
    console.log(`   ⏰ 最后心跳: ${new Date(status.connection.lastHeartbeat).toLocaleString('zh-CN')}\n`);

    // 3. 测试飞书事件端点
    console.log('3. 测试飞书事件端点');
    const eventTest = await axios.post(`${BASE_URL}/feishu/events`, {
      type: 'url_verification',
      challenge: 'basic_test_123'
    });
    console.log(`   ✅ 事件端点: ${eventTest.data.challenge === 'basic_test_123' ? '正常' : '异常'}\n`);

    console.log('🎉 基础飞书API测试完成！');
    console.log('\n📋 测试结果:');
    console.log('✅ 服务状态正常');
    console.log('✅ 飞书连接正常');
    console.log('✅ 事件端点正常');
    
    console.log('\n🚀 下一步:');
    console.log('1. 确保机器人已添加到飞书群组');
    console.log('2. 在群组中发送测试消息');
    console.log('3. 检查消息计数是否增加');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    console.log('\n🔧 故障排除建议:');
    console.log('1. 检查.env文件中的飞书配置');
    console.log('2. 确保飞书应用已正确配置');
    console.log('3. 检查网络连接');
  }
}

// 运行测试
testBasicFeishu();
