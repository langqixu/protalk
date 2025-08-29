#!/usr/bin/env node

/**
 * 测试新的卡片构建器
 */

const path = require('path');

// 设置正确的模块路径
const newBuilderPath = path.join(__dirname, '../src/utils/feishu-card-v2-builder-new.ts');

try {
  // 尝试直接编译和加载
  require('ts-node').register();
  const { buildReviewCardV2New } = require(newBuilderPath);

  // 测试数据
  const testReviewData = {
    id: 'test_review_123',
    rating: 1,
    title: '测试标题',
    content: '这是测试内容',
    author: '测试用户',
    date: new Date().toISOString(),
    app_name: '潮汐 for iOS',
    store_type: 'ios',
    version: '2.3.4',
    country: 'US'
  };

  console.log('🧪 测试新卡片构建器...');
  console.log('输入数据:', JSON.stringify(testReviewData, null, 2));

  const card = buildReviewCardV2New(testReviewData);
  console.log('✅ 新卡片构建成功!');
  console.log('卡片结构:', JSON.stringify(card, null, 2));

} catch (error) {
  console.error('❌ 新卡片构建器测试失败:', error.message);
  
  // 降级测试：使用编译后的JS文件
  try {
    console.log('🔄 尝试使用编译后的文件...');
    const { buildReviewCardV2New } = require('../dist/utils/feishu-card-v2-builder-new.js');
    
    const testReviewData = {
      id: 'test_review_123',
      rating: 1,
      title: '测试标题',
      content: '这是测试内容',
      author: '测试用户',
      date: new Date().toISOString(),
      app_name: '潮汐 for iOS',
      store_type: 'ios',
      version: '2.3.4',
      country: 'US'
    };

    const card = buildReviewCardV2New(testReviewData);
    console.log('✅ 编译版本构建成功!');
    console.log('卡片类型:', typeof card);
    console.log('是否有表单:', card.elements?.some(e => e.tag === 'form'));
    
  } catch (distError) {
    console.error('❌ 编译版本也失败:', distError.message);
  }
}
