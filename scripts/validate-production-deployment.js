#!/usr/bin/env node

/**
 * 生产环境部署验证脚本
 * 用于验证Zeabur部署是否成功
 */

const axios = require('axios');

// 生产环境URL (需要根据实际部署URL修改)
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://your-app.zeabur.app';

async function validateDeployment() {
  console.log('🚀 开始验证生产环境部署...\n');
  
  const tests = [
    {
      name: '健康检查',
      endpoint: '/health',
      expected: { status: 200, contains: 'status' }
    },
    {
      name: '飞书服务状态',
      endpoint: '/feishu/status',
      expected: { status: 200, contains: 'apiVersion' }
    },
    {
      name: '飞书健康检查',
      endpoint: '/feishu/health',
      expected: { status: 200, contains: 'health' }
    },
    {
      name: '群组列表获取',
      endpoint: '/feishu/chats',
      expected: { status: 200, contains: 'success' }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`🧪 测试: ${test.name}`);
      console.log(`   URL: ${PRODUCTION_URL}${test.endpoint}`);
      
      const response = await axios.get(`${PRODUCTION_URL}${test.endpoint}`, {
        timeout: 10000,
        validateStatus: () => true // 允许所有状态码
      });

      const responseText = typeof response.data === 'string' 
        ? response.data 
        : JSON.stringify(response.data);

      if (response.status === test.expected.status && 
          responseText.includes(test.expected.contains)) {
        console.log(`   ✅ 通过 (状态码: ${response.status})`);
        passed++;
      } else {
        console.log(`   ❌ 失败 (状态码: ${response.status})`);
        console.log(`   预期: 状态码 ${test.expected.status}, 包含 "${test.expected.contains}"`);
        console.log(`   实际: ${responseText.substring(0, 200)}...`);
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ 网络错误: ${error.message}`);
      failed++;
    }
    
    console.log('');
  }

  console.log('📊 验证结果:');
  console.log(`   ✅ 通过: ${passed}`);
  console.log(`   ❌ 失败: ${failed}`);
  console.log(`   📈 成功率: ${(passed / (passed + failed) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 部署验证成功！所有检查都通过了。');
    console.log('🚀 生产环境已准备就绪！');
    process.exit(0);
  } else {
    console.log('\n⚠️  部署验证发现问题，请检查服务状态。');
    process.exit(1);
  }
}

async function checkEnvironmentVariables() {
  console.log('🔧 环境变量检查:');
  
  const requiredVars = [
    'PRODUCTION_URL'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.log('⚠️  缺少环境变量:');
    missing.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('\n使用方法:');
    console.log('   PRODUCTION_URL=https://your-app.zeabur.app node scripts/validate-production-deployment.js');
    console.log('');
  } else {
    console.log('✅ 所有必需的环境变量都已设置\n');
  }
}

async function main() {
  try {
    await checkEnvironmentVariables();
    await validateDeployment();
  } catch (error) {
    console.error('💥 验证过程发生错误:', error.message);
    process.exit(1);
  }
}

// 如果没有提供PRODUCTION_URL，显示帮助信息
if (!process.env.PRODUCTION_URL) {
  console.log('📋 生产环境部署验证脚本');
  console.log('');
  console.log('用法:');
  console.log('   PRODUCTION_URL=https://your-app.zeabur.app npm run validate:prod');
  console.log('');
  console.log('或者:');
  console.log('   export PRODUCTION_URL=https://your-app.zeabur.app');
  console.log('   node scripts/validate-production-deployment.js');
  console.log('');
  console.log('请将 "your-app.zeabur.app" 替换为你的实际Zeabur部署URL');
  process.exit(1);
}

main();
