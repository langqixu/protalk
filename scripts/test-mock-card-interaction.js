#!/usr/bin/env node

/**
 * @file test-mock-card-interaction.js
 * @description 飞书卡片交互测试脚本的Node.js执行器
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动飞书卡片交互测试...\n');

// 设置环境变量
process.env.MOCK_MODE = 'true';
process.env.NODE_ENV = 'test';

// 编译并运行TypeScript测试文件
const testFile = path.join(__dirname, '../src/test/mock-card-interaction.ts');

// 使用ts-node运行TypeScript文件
const child = spawn('npx', ['ts-node', testFile], {
  stdio: 'inherit',
  env: {
    ...process.env,
    MOCK_MODE: 'true',
    NODE_ENV: 'test'
  }
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ 测试完成');
  } else {
    console.log(`\n❌ 测试失败，退出代码: ${code}`);
    process.exit(code);
  }
});

child.on('error', (error) => {
  console.error('❌ 启动测试失败:', error.message);
  process.exit(1);
});
