const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 确保 dist 目录存在
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// 编译整个项目
try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('✅ 项目编译成功');
} catch (error) {
  console.error('❌ 编译失败:', error.message);
  process.exit(1);
}
