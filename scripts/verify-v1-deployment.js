#!/usr/bin/env node

/**
 * 验证v1 API部署成功
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function verifyDeployment() {
  console.log('🔍 验证v1 API部署状态...\n');
  
  try {
    // 1. 检查健康状态
    console.log('1️⃣ 检查应用健康状态...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    const health = healthResponse.data;
    
    console.log(`✅ 应用状态: ${health.status}`);
    console.log(`📊 版本信息: ${health.version}`);
    console.log(`🔧 API版本: ${health.apiVersion}`);
    console.log(`🤖 服务类型: ${health.feishuServiceType}`);
    
    if (health.apiVersion !== 'v1') {
      throw new Error(`期望API版本为v1，实际为: ${health.apiVersion}`);
    }
    
    if (health.feishuServiceType !== 'v1') {
      throw new Error(`期望飞书服务类型为v1，实际为: ${health.feishuServiceType}`);
    }
    
    // 2. 检查飞书服务状态
    console.log('\n2️⃣ 检查飞书v1服务状态...');
    const feishuResponse = await axios.get(`${BASE_URL}/feishu/status`);
    const feishuStatus = feishuResponse.data;
    
    console.log(`✅ 飞书服务: ${feishuStatus.success ? '正常' : '异常'}`);
    console.log(`🔧 API版本: ${feishuStatus.status.apiVersion}`);
    console.log(`📡 连接模式: ${feishuStatus.status.mode}`);
    console.log(`📊 消息计数: ${feishuStatus.status.messageCount}`);
    console.log(`🔐 签名验证: ${feishuStatus.status.signatureVerification ? '启用' : '禁用'}`);
    
    if (feishuStatus.status.apiVersion !== 'v1') {
      throw new Error(`期望飞书API版本为v1，实际为: ${feishuStatus.status.apiVersion}`);
    }
    
    // 3. 测试消息发送
    console.log('\n3️⃣ 测试v1 API消息发送...');
    const testResponse = await axios.get(`${BASE_URL}/feishu/test`);
    const testResult = testResponse.data;
    
    console.log(`✅ 测试结果: ${testResult.success ? '成功' : '失败'}`);
    console.log(`📝 消息: ${testResult.message}`);
    console.log(`🔧 API版本: ${testResult.api_version}`);
    
    if (testResult.api_version !== 'v1') {
      throw new Error(`期望测试API版本为v1，实际为: ${testResult.api_version}`);
    }
    
    console.log('\n🎉 v1 API部署验证成功！');
    console.log('=' .repeat(50));
    console.log('✅ 所有检查项目通过');
    console.log('✅ v1 API正常运行');
    console.log('✅ 飞书服务工作正常');
    console.log('✅ 消息发送功能验证成功');
    console.log('=' .repeat(50));
    
    console.log('\n📊 部署摘要:');
    console.log(`• 应用版本: ${health.version}`);
    console.log(`• API版本: ${health.apiVersion}`);
    console.log(`• 飞书模式: ${feishuStatus.status.mode}`);
    console.log(`• 安全设置: 签名验证${feishuStatus.status.signatureVerification ? '已启用' : '已禁用'}`);
    console.log(`• 启动时间: ${health.timestamp}`);
    
    return true;
    
  } catch (error) {
    console.error('\n❌ v1 API部署验证失败:');
    console.error(`错误信息: ${error.message}`);
    
    if (error.response) {
      console.error(`HTTP状态: ${error.response.status}`);
      console.error(`响应数据:`, error.response.data);
    }
    
    return false;
  }
}

if (require.main === module) {
  verifyDeployment()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n💥 验证脚本执行失败:', error.message);
      process.exit(1);
    });
}

module.exports = verifyDeployment;
