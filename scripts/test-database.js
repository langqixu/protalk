const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 从环境变量获取配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 环境变量');
  console.log('请确保设置了 SUPABASE_URL 和 SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
  try {
    console.log('🔍 测试数据库连接...');
    
    // 测试基本连接
    const { data, error } = await supabase
      .from('app_reviews')
      .select('count')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    console.log('✅ 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

async function checkTableStructure() {
  try {
    console.log('🔍 检查表结构...');
    
    // 检查 app_reviews 表
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('app_reviews')
      .select('*')
      .limit(1);
    
    if (reviewsError) {
      console.error('❌ app_reviews 表检查失败:', reviewsError.message);
      return false;
    }
    
    // 检查 sync_log 表
    const { data: syncData, error: syncError } = await supabase
      .from('sync_log')
      .select('*')
      .limit(1);
    
    if (syncError) {
      console.error('❌ sync_log 表检查失败:', syncError.message);
      return false;
    }
    
    console.log('✅ 表结构检查通过');
    return true;
  } catch (error) {
    console.error('❌ 表结构检查失败:', error.message);
    return false;
  }
}

async function checkDataCount() {
  try {
    console.log('🔍 检查数据量...');
    
    // 获取评论数量
    const { count: reviewsCount, error: reviewsError } = await supabase
      .from('app_reviews')
      .select('*', { count: 'exact', head: true });
    
    if (reviewsError) {
      console.error('❌ 获取评论数量失败:', reviewsError.message);
      return false;
    }
    
    // 获取同步日志数量
    const { count: syncCount, error: syncError } = await supabase
      .from('sync_log')
      .select('*', { count: 'exact', head: true });
    
    if (syncError) {
      console.error('❌ 获取同步日志数量失败:', syncError.message);
      return false;
    }
    
    console.log(`✅ 数据统计:`);
    console.log(`   - app_reviews: ${reviewsCount} 条记录`);
    console.log(`   - sync_log: ${syncCount} 条记录`);
    
    return true;
  } catch (error) {
    console.error('❌ 数据量检查失败:', error.message);
    return false;
  }
}

async function testInsertOperation() {
  try {
    console.log('🔍 测试插入操作...');
    
    // 测试插入一条记录到 sync_log
    const testData = {
      app_id: 'test_app_123',
      last_sync_time: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('sync_log')
      .upsert(testData, { onConflict: 'app_id' });
    
    if (error) {
      console.error('❌ 插入操作失败:', error.message);
      return false;
    }
    
    console.log('✅ 插入操作测试通过');
    
    // 清理测试数据
    await supabase
      .from('sync_log')
      .delete()
      .eq('app_id', 'test_app_123');
    
    return true;
  } catch (error) {
    console.error('❌ 插入操作测试失败:', error.message);
    return false;
  }
}

async function runDatabaseTests() {
  console.log('🚀 开始数据库测试...\n');
  
  const tests = [
    { name: '数据库连接', fn: testDatabaseConnection },
    { name: '表结构检查', fn: checkTableStructure },
    { name: '数据量统计', fn: checkDataCount },
    { name: '插入操作测试', fn: testInsertOperation }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n📋 ${test.name}`);
    console.log('─'.repeat(50));
    const result = await test.fn();
    results.push({ name: test.name, passed: result });
  }
  
  console.log('\n📊 数据库测试结果汇总');
  console.log('─'.repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
  });
  
  console.log(`\n🎯 总体结果: ${passed}/${total} 通过`);
  
  if (passed === total) {
    console.log('🎉 数据库配置完全正常！');
    console.log('💡 建议：可以直接进行评论同步测试');
  } else {
    console.log('⚠️ 数据库配置有问题，需要检查');
    console.log('💡 建议：检查 Supabase 配置和环境变量');
  }
}

// 运行测试
runDatabaseTests().catch(console.error);
