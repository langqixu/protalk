#!/usr/bin/env node

/**
 * 直接测试 buildReviewCardV2 函数生成的卡片
 */

const http = require('http');

// 模拟一个无回复状态的评论
function createReviewData() {
  return {
    id: 'direct_test_001',
    rating: 1,
    title: '[直接测试] 无回复状态',
    content: '这是直接使用 buildReviewCardV2 函数创建的测试卡片，应该显示输入框',
    author: '直接测试用户',
    date: new Date().toISOString(),
    app_name: '潮汐 for iOS',
    store_type: 'ios',
    version: '2.3.4',
    country: 'US',
    // 确保没有回复
    developer_response: null
  };
}

function testBuildReviewCardV2() {
  return new Promise((resolve, reject) => {
    const reviewData = createReviewData();
    
    // 直接调用 buildReviewCardV2 生成卡片
    const { buildReviewCardV2 } = require('../dist/utils/feishu-card-v2-builder.js');
    const cardData = buildReviewCardV2(reviewData);
    
    const data = JSON.stringify({ cardData });

    console.log('🧪 直接使用 buildReviewCardV2 生成的卡片:');
    console.log(JSON.stringify(cardData, null, 2));
    console.log('\n📤 发送到自定义卡片端点...');

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/feishu/test/custom-card',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ 发送成功 (${res.statusCode}):`, responseData);
        resolve(responseData);
      });
    });

    req.on('error', (e) => {
      console.error('❌ 发送失败:', e);
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

testBuildReviewCardV2().then(() => {
  console.log('\n🎉 直接测试 buildReviewCardV2 完成');
  console.log('📋 检查要点：');
  console.log('   1. 卡片结构是否使用了 form + column_set 格式');
  console.log('   2. 是否包含输入框和提交按钮');
  console.log('   3. 按钮是否使用了 behaviors 回调格式');
}).catch(error => {
  console.error('❌ 测试失败:', error);
});
