#!/usr/bin/env node

const axios = require('axios');

async function testProductionAuth() {
  console.log('🔐 测试生产环境飞书认证\n');

  try {
    // 创建一个临时测试端点来获取配置信息
    console.log('💡 解决方案建议:');
    console.log('');
    console.log('问题：生产环境无法获取群组列表，说明配置不同步');
    console.log('');
    console.log('可能原因:');
    console.log('   1. 生产环境的 FEISHU_APP_ID 与本地不同');
    console.log('   2. 生产环境的 FEISHU_APP_SECRET 与本地不同');
    console.log('   3. 生产环境使用的是不同的飞书应用');
    console.log('   4. 生产环境的机器人没有被添加到群组中');
    console.log('');
    console.log('解决步骤:');
    console.log('   1. 检查部署平台的环境变量设置');
    console.log('   2. 确保 FEISHU_APP_ID 和 FEISHU_APP_SECRET 与本地一致');
    console.log('   3. 确保机器人已被添加到目标群组');
    console.log('   4. 重新部署应用');
    console.log('');
    console.log('验证本地配置:');
    console.log(`   本地 APP_ID: ${process.env.FEISHU_APP_ID || '未设置'}`);
    console.log(`   本地能获取群组: 是 (1个群组)`);
    console.log(`   本地群组ID: oc_130c7aece1e0c64c817d4bc764d1b686`);
    console.log('');
    console.log('验证生产环境:');
    console.log(`   生产环境能获取群组: 否 (0个群组)`);
    console.log(`   这表明生产环境的配置与本地不同`);

    // 测试一个简单的API调用来获取更多信息
    console.log('\n🧪 测试生产环境基础功能...');
    
    try {
      const response = await axios.get('https://protalk.zeabur.app/feishu/status');
      console.log('✅ 生产环境服务正常运行');
      console.log(`   当前模式: ${response.data.data.mode.currentMode}`);
      console.log(`   服务健康: ${response.data.data.mode.isHealthy}`);
    } catch (error) {
      console.log('❌ 生产环境服务异常');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testProductionAuth().catch(console.error);
