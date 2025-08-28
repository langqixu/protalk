const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseCleanup() {
  console.log('🔍 检查数据库中需要清理的表...\n');
  
  try {
    // 检查所有表
    const { data: tables, error } = await supabase.rpc('get_all_tables');
    
    if (error) {
      console.log('📋 使用备用方法查询表信息...');
      
      // 检查可能存在的备份表和临时表
      const tablesToCheck = [
        'app_reviews',
        'app_reviews_old',
        'app_reviews_new', 
        'app_reviews_backup',
        'app_reviews_backup_manual',
        'app_feedback',
        'app_rating_daily_stats'
      ];
      
      console.log('🔍 检查以下表的存在状态:');
      for (const tableName of tablesToCheck) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('count(*)', { count: 'exact', head: true });
            
          if (!error) {
            console.log(`✅ ${tableName}: 存在 (${data?.length || 0} 条记录)`);
          }
        } catch (e) {
          console.log(`❌ ${tableName}: 不存在`);
        }
      }
    } else {
      console.log('📋 数据库表列表:', tables);
    }
    
    // 检查当前app_reviews表的记录数
    const { count } = await supabase
      .from('app_reviews')
      .select('*', { count: 'exact', head: true });
      
    console.log(`\n📊 app_reviews表当前记录数: ${count}`);
    
    // 检查是否有索引冲突
    console.log('\n🔍 建议清理的内容:');
    console.log('1. app_reviews_old 表 (迁移后的旧表)');
    console.log('2. app_reviews_backup_manual 表 (手动备份表)');
    console.log('3. 可能残留的临时索引');
    console.log('4. 未使用的表结构');
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

checkDatabaseCleanup();
