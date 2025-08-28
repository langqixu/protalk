#!/usr/bin/env node

const axios = require('axios');
const { execSync } = require('child_process');

const LOCAL_URL = 'http://localhost:3000';
let PUBLIC_URL = '';

async function checkNgrokStatus() {
  console.log('🔍 检查ngrok状态...');
  
  try {
    const response = await axios.get('http://localhost:4040/api/tunnels');
    const tunnels = response.data.tunnels;
    
    if (tunnels.length === 0) {
      console.log('❌ ngrok隧道未运行');
      return false;
    }
    
    const tunnel = tunnels[0];
    PUBLIC_URL = tunnel.public_url;
    
    console.log(`✅ ngrok隧道运行正常`);
    console.log(`   📡 公网地址: ${PUBLIC_URL}`);
    console.log(`   🔗 本地地址: ${tunnel.config.addr}`);
    console.log(`   📊 连接数: ${tunnel.metrics.conns.count}`);
    
    return true;
  } catch (error) {
    console.log('❌ ngrok未运行或无法访问');
    return false;
  }
}

async function restartNgrok() {
  console.log('🔄 重启ngrok隧道...');
  
  try {
    // 停止现有的ngrok进程
    execSync('pkill -f ngrok', { stdio: 'ignore' });
    console.log('   ✅ 已停止现有ngrok进程');
    
    // 等待2秒
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 启动新的ngrok隧道
    console.log('   🚀 启动新的ngrok隧道...');
    execSync('ngrok http 3000', { stdio: 'ignore' });
    
    // 等待3秒让隧道建立
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('   ✅ ngrok隧道已重启');
    return true;
  } catch (error) {
    console.log('❌ 重启ngrok失败:', error.message);
    return false;
  }
}

async function testLocalService() {
  console.log('\n🧪 测试本地服务...');
  
  try {
    const response = await axios.get(`${LOCAL_URL}/api/health`);
    console.log(`✅ 本地服务正常: ${response.data.data.status}`);
    return true;
  } catch (error) {
    console.log('❌ 本地服务异常:', error.message);
    return false;
  }
}

async function testPublicEndpoint(endpoint) {
  console.log(`\n🌐 测试公网端点: ${endpoint}`);
  
  try {
    const response = await axios.post(`${PUBLIC_URL}${endpoint}`, {
      type: 'url_verification',
      challenge: 'test_123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log(`✅ 端点响应正常:`, response.data);
    return true;
  } catch (error) {
    console.log(`❌ 端点测试失败:`, error.message);
    if (error.response) {
      console.log(`   HTTP状态: ${error.response.status}`);
      console.log(`   响应头:`, error.response.headers);
      console.log(`   响应体:`, error.response.data);
    }
    return false;
  }
}

async function diagnoseFeishuIssue() {
  console.log('🔍 诊断飞书事件订阅问题...\n');
  
  // 1. 检查ngrok状态
  const ngrokOk = await checkNgrokStatus();
  if (!ngrokOk) {
    console.log('\n🔄 尝试重启ngrok...');
    const restartOk = await restartNgrok();
    if (!restartOk) {
      console.log('❌ 无法启动ngrok，请手动检查');
      return;
    }
    
    // 重新检查ngrok状态
    const newNgrokOk = await checkNgrokStatus();
    if (!newNgrokOk) {
      console.log('❌ ngrok重启后仍无法正常工作');
      return;
    }
  }
  
  // 2. 测试本地服务
  const localOk = await testLocalService();
  if (!localOk) {
    console.log('❌ 本地服务异常，请先启动服务');
    return;
  }
  
  // 3. 测试公网端点
  const endpoints = [
    '/feishu/verify',
    '/feishu/events',
    '/feishu/events-fast',
    '/feishu/simple'
  ];
  
  let allEndpointsOk = true;
  for (const endpoint of endpoints) {
    const ok = await testPublicEndpoint(endpoint);
    if (!ok) {
      allEndpointsOk = false;
    }
  }
  
  // 4. 生成解决方案
  console.log('\n📋 诊断结果和解决方案:');
  
  if (allEndpointsOk) {
    console.log('✅ 所有端点测试通过！');
    console.log('\n🎯 下一步操作:');
    console.log(`1. 在飞书开发者后台更新事件网址为: ${PUBLIC_URL}/feishu/events`);
    console.log(`2. 点击"验证"按钮测试连接`);
    console.log(`3. 如果验证失败，尝试使用备用端点: ${PUBLIC_URL}/feishu/events-fast`);
  } else {
    console.log('❌ 部分端点测试失败');
    console.log('\n🔧 可能的解决方案:');
    console.log('1. 检查本地服务是否正常运行');
    console.log('2. 检查防火墙设置');
    console.log('3. 尝试使用不同的ngrok端口');
    console.log('4. 检查网络连接');
  }
  
  // 5. 提供配置建议
  console.log('\n📝 飞书开发者后台配置建议:');
  console.log(`   请求网址: ${PUBLIC_URL}/feishu/events`);
  console.log('   验证令牌: 你的验证令牌');
  console.log('   加密密钥: 你的加密密钥');
  console.log('   订阅事件: im.message.receive_v1, im.message.reaction.created_v1');
  
  // 6. 提供测试命令
  console.log('\n🧪 手动测试命令:');
  console.log(`curl -X POST -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"type":"url_verification","challenge":"test_123"}' \\`);
  console.log(`  ${PUBLIC_URL}/feishu/events`);
}

async function main() {
  console.log('🚀 飞书事件订阅问题诊断工具\n');
  
  try {
    await diagnoseFeishuIssue();
  } catch (error) {
    console.error('❌ 诊断过程中发生错误:', error.message);
  }
  
  console.log('\n✨ 诊断完成！');
}

// 运行诊断
main().catch(console.error);
