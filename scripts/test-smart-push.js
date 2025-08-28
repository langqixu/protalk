/**
 * 测试智能推送逻辑
 * 验证重复推送防护功能
 */

const { loadConfig } = require('../dist/config');
const { AppStoreReviewFetcher } = require('../dist/modules/fetcher/AppStoreReviewFetcher');
const { SupabaseManager } = require('../dist/modules/storage/SupabaseManager');
const { FeishuServiceV1 } = require('../dist/services/FeishuServiceV1');
const { SmartReviewSyncService } = require('../dist/services/SmartReviewSyncService');

async function testSmartPush() {
  console.log('🧪 开始测试智能推送逻辑...\n');
  
  try {
    // 1. 加载配置
    console.log('📋 加载配置...');
    const { app: appConfig, env: envConfig } = loadConfig();
    
    // 2. 初始化服务
    console.log('🔧 初始化服务...');
    
    const fetcher = new AppStoreReviewFetcher({
      appStore: envConfig.appStore,
      api: appConfig.api
    });
    
    const db = new SupabaseManager({
      supabase: envConfig.supabase
    });
    
    const feishuService = new FeishuServiceV1({
      appId: envConfig.feishu.appId,
      appSecret: envConfig.feishu.appSecret,
      verificationToken: envConfig.feishu.verificationToken,
      encryptKey: envConfig.feishu.encryptKey,
      supabaseUrl: envConfig.supabase.url,
      supabaseKey: envConfig.supabase.anonKey,
      enableSignatureVerification: false,
      mode: 'webhook'
    });
    
    // 3. 创建智能同步服务
    const smartSyncService = new SmartReviewSyncService(
      fetcher,
      db,
      feishuService,
      {
        pushNewReviews: true,
        pushUpdatedReviews: true,
        pushHistoricalReviews: false, // 关闭历史数据推送以测试
        markHistoricalAsPushed: true,
        historicalThresholdHours: 24
      }
    );
    
    console.log('✅ 服务初始化完成\n');
    
    // 4. 执行第一次同步
    console.log('🔄 执行第一次同步测试...');
    const result1 = await smartSyncService.syncReviews('1077776989');
    console.log('第一次同步结果:', {
      total: result1.total,
      new: result1.new,
      updated: result1.updated,
      errors: result1.errors.length
    });
    
    // 等待3秒
    console.log('\n⏳ 等待3秒后执行第二次同步...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 5. 执行第二次同步（应该不会有重复推送）
    console.log('🔄 执行第二次同步测试...');
    const result2 = await smartSyncService.syncReviews('1077776989');
    console.log('第二次同步结果:', {
      total: result2.total,
      new: result2.new,
      updated: result2.updated,
      errors: result2.errors.length
    });
    
    // 6. 获取同步统计
    console.log('\n📊 获取同步统计...');
    const stats = await smartSyncService.getSyncStats('1077776989');
    console.log('同步统计:', stats);
    
    console.log('\n✅ 智能推送逻辑测试完成！');
    
    // 验证结果
    if (result1.new > 0 && result2.new === 0 && result2.updated === 0) {
      console.log('🎉 测试通过：重复推送防护机制正常工作！');
    } else {
      console.log('⚠️  测试结果需要验证：');
      console.log('  - 第一次同步应该有新内容推送');
      console.log('  - 第二次同步应该没有重复推送');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
  }
}

// 运行测试
testSmartPush().then(() => {
  console.log('\n🏁 测试脚本执行完成');
  process.exit(0);
}).catch(error => {
  console.error('💥 测试脚本执行失败:', error);
  process.exit(1);
});
