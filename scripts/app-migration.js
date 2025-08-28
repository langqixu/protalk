#!/usr/bin/env node

/**
 * 通过应用本身执行数据库迁移
 * 使用现有的SupabaseManager进行数据迁移
 */

const path = require('path');
const fs = require('fs');

// 添加src目录到模块路径
require('ts-node/register');
process.env.NODE_PATH = path.join(__dirname, '../src');
require('module')._initPaths();

// 导入应用模块
const { loadConfig } = require('../src/config');
const { SupabaseManager } = require('../src/modules/storage/SupabaseManager');

async function executeWithManager() {
  console.log('🚀 开始执行数据库迁移');
  console.log('='.repeat(50));
  
  try {
    // 1. 加载配置
    console.log('📋 加载应用配置...');
    const { env: envConfig } = loadConfig();
    
    // 2. 初始化数据库管理器
    console.log('📋 初始化数据库连接...');
    const db = new SupabaseManager({ supabase: envConfig.supabase });
    
    // 3. 检查当前状态
    console.log('📋 检查当前表状态...');
    const existingIds = await db.getExistingReviewIds('1077776989');
    console.log(`✅ 当前app_reviews表记录数: ${existingIds.size}`);
    
    // 4. 由于我们无法直接执行DDL，我们需要手动指导
    console.log('\n⚠️  注意：Supabase客户端无法执行DDL语句');
    console.log('我们需要通过Supabase Dashboard执行迁移');
    
    console.log('\n📋 请按以下步骤操作：');
    console.log('1. 打开 https://supabase.com/dashboard');
    console.log('2. 选择你的项目 (eyilhfwozixhdowsoffh)');
    console.log('3. 转到 SQL Editor');
    console.log('4. 创建新查询并粘贴以下SQL：');
    
    // 读取SQL文件内容
    const sqlPath = path.join(__dirname, '../database/final-app-reviews-schema.sql');
    if (fs.existsSync(sqlPath)) {
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      console.log('\n' + '='.repeat(60));
      console.log('SQL内容:');
      console.log('='.repeat(60));
      console.log(sqlContent);
      console.log('='.repeat(60));
    }
    
    console.log('\n5. 执行SQL');
    console.log('6. 运行验证脚本: node scripts/simple-migration.js');
    
  } catch (error) {
    console.error('❌ 迁移过程出错:', error.message);
    console.error('详细错误:', error);
  }
}

if (require.main === module) {
  executeWithManager().catch(error => {
    console.error('❌ 脚本执行失败:', error.message);
    process.exit(1);
  });
}

module.exports = { executeWithManager };
