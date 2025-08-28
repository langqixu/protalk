#!/usr/bin/env node

/**
 * 飞书v1 API集成测试
 * 验证完整的v1 API服务集成
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

class V1IntegrationTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  async runTest(testName, testFn) {
    this.testResults.total++;
    try {
      console.log(`\n🧪 ${testName}...`);
      await testFn();
      this.testResults.passed++;
      this.testResults.details.push({ name: testName, status: '✅ 通过' });
      console.log(`✅ ${testName} - 通过`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.details.push({ 
        name: testName, 
        status: '❌ 失败', 
        error: error.message 
      });
      console.error(`❌ ${testName} - 失败: ${error.message}`);
    }
  }

  async testHealthCheck() {
    const response = await axios.get(`${BASE_URL}/health`);
    if (response.data.status !== 'ok') {
      throw new Error('健康检查失败');
    }
  }

  async testFeishuStatus() {
    const response = await axios.get(`${BASE_URL}/feishu/status`);
    if (!response.data.success) {
      throw new Error('飞书状态检查失败');
    }
    
    const status = response.data.status;
    console.log(`📊 服务状态: API版本=${status.apiVersion}, 模式=${status.mode}`);
  }

  async testGetChatList() {
    const response = await axios.get(`${BASE_URL}/feishu/chats`);
    if (!response.data.success) {
      throw new Error('获取群组列表失败');
    }
    
    console.log(`📋 找到 ${response.data.data.chats.length} 个群组`);
  }

  async testSendTextMessage() {
    const response = await axios.post(`${BASE_URL}/feishu/send-message`, {
      content: `🧪 v1集成测试 - 文本消息 - ${new Date().toLocaleString('zh-CN')}`
    });
    
    if (!response.data.success) {
      throw new Error('发送文本消息失败');
    }
    
    console.log(`📝 消息ID: ${response.data.message_id}`);
  }

  async testSendCardMessage() {
    const testCard = {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: "plain_text", content: "🧪 v1集成测试卡片" },
        template: "blue"
      },
      elements: [
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**测试时间**: ${new Date().toLocaleString('zh-CN')}\n**API版本**: v1\n**测试状态**: ✅ 进行中`
          }
        }
      ]
    };

    const response = await axios.post(`${BASE_URL}/feishu/send-card`, {
      card: testCard
    });
    
    if (!response.data.success) {
      throw new Error('发送卡片消息失败');
    }
    
    console.log(`🎴 卡片消息ID: ${response.data.message_id}`);
  }

  async testSendToSpecificChat() {
    const mockReview = {
      id: 'test_review_' + Date.now(),
      app_name: 'Protalk',
      rating: 5,
      title: '集成测试评论',
      content: 'v1 API集成测试正在进行中，所有功能运行正常！',
      author: '测试用户',
      version: '2.1.0',
      date: new Date().toISOString(),
      store_type: 'ios'
    };

    const response = await axios.post(`${BASE_URL}/feishu/send-to`, {
      chat_id: 'oc_130c7aece1e0c64c817d4bc764d1b686',
      review: mockReview
    });
    
    if (!response.data.success) {
      throw new Error('发送评论卡片失败');
    }
    
    console.log(`🍎 评论卡片发送成功，群组: ${response.data.chat_id}`);
  }

  async testConnectionTest() {
    const response = await axios.get(`${BASE_URL}/feishu/test`);
    
    if (!response.data.success) {
      throw new Error(`连接测试失败: ${response.data.error}`);
    }
    
    console.log(`🔗 连接测试成功，API版本: ${response.data.api_version}`);
  }

  async runAllTests() {
    console.log('🚀 开始飞书v1 API集成测试');
    console.log(`🌐 测试目标: ${BASE_URL}`);
    
    await this.runTest('健康检查', () => this.testHealthCheck());
    await this.runTest('飞书服务状态', () => this.testFeishuStatus());
    await this.runTest('获取群组列表', () => this.testGetChatList());
    await this.runTest('发送文本消息', () => this.testSendTextMessage());
    
    // 等待避免发送过快
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await this.runTest('发送卡片消息', () => this.testSendCardMessage());
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await this.runTest('发送评论到指定群组', () => this.testSendToSpecificChat());
    await this.runTest('连接测试', () => this.testConnectionTest());
    
    this.printResults();
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试结果总结');
    console.log('='.repeat(60));
    
    console.log(`总测试数: ${this.testResults.total}`);
    console.log(`✅ 通过: ${this.testResults.passed}`);
    console.log(`❌ 失败: ${this.testResults.failed}`);
    console.log(`📈 成功率: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
    
    console.log('\n📋 详细结果:');
    this.testResults.details.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.name} - ${result.status}`);
      if (result.error) {
        console.log(`     错误: ${result.error}`);
      }
    });
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 所有测试通过！v1 API集成测试成功！');
      console.log('✅ 系统已准备好使用v1 API');
    } else {
      console.log('\n⚠️  存在测试失败，请检查相关配置和服务状态');
    }
    
    console.log('='.repeat(60));
  }
}

// 运行测试
if (require.main === module) {
  const tester = new V1IntegrationTester();
  
  tester.runAllTests()
    .then(() => {
      const exitCode = tester.testResults.failed > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('\n💥 集成测试执行失败:', error.message);
      process.exit(1);
    });
}

module.exports = V1IntegrationTester;
