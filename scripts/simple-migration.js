#!/usr/bin/env node

/**
 * 简化的数据库迁移脚本
 * 使用Supabase客户端逐步执行迁移
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 缺少环境变量：SUPABASE_URL 或 SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTableStatus() {
  console.log('🔍 检查当前表状态...');
  
  try {
    // 检查现有app_reviews表
    const { data: reviews, error: reviewsError } = await supabase
      .from('app_reviews')
      .select('*')
      .limit(5);
    
    if (reviewsError) {
      console.error('❌ 无法访问app_reviews表:', reviewsError.message);
      return false;
    }
    
    console.log(`✅ app_reviews表存在，样本数据:`, reviews?.length || 0);
    
    // 检查字段结构
    if (reviews && reviews.length > 0) {
      const sampleRecord = reviews[0];
      console.log('📋 当前字段:', Object.keys(sampleRecord));
      
      // 检查是否已经是新结构
      if (sampleRecord.hasOwnProperty('reviewer_nickname') && sampleRecord.hasOwnProperty('data_type')) {
        console.log('✅ 表已经是新结构，无需迁移');
        return false;
      }
    }
    
    // 获取总记录数
    const { count, error: countError } = await supabase
      .from('app_reviews')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ 无法获取记录数:', countError.message);
    } else {
      console.log(`📊 当前记录总数: ${count}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ 检查表状态失败:', error.message);
    return false;
  }
}

async function getPostgreSQLConnection() {
  // 从Supabase URL构建PostgreSQL连接字符串
  const url = new URL(SUPABASE_URL);
  const projectId = url.hostname.split('.')[0];
  
  // Supabase PostgreSQL连接格式
  const pgUrl = `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD || '[PASSWORD]'}@db.${projectId}.supabase.co:5432/postgres`;
  
  console.log('🔗 PostgreSQL连接格式:');
  console.log(`   项目ID: ${projectId}`);
  console.log(`   连接串: postgresql://postgres:[PASSWORD]@db.${projectId}.supabase.co:5432/postgres`);
  console.log('');
  console.log('📋 要获取数据库密码，请在Supabase Dashboard > Settings > Database中查看');
  
  return pgUrl;
}

async function manualMigrationSteps() {
  console.log('\n🚀 手动迁移步骤指南');
  console.log('='.repeat(60));
  
  const pgUrl = await getPostgreSQLConnection();
  
  console.log('\n📋 步骤1: 获取数据库密码');
  console.log('   1. 访问 https://supabase.com/dashboard');
  console.log('   2. 选择你的项目');
  console.log('   3. 转到 Settings > Database');
  console.log('   4. 复制 Database Password');
  
  console.log('\n📋 步骤2: 执行迁移SQL');
  console.log('   1. 打开终端');
  console.log('   2. 设置PATH: export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"');
  console.log('   3. 执行迁移:');
  console.log(`   psql "postgresql://postgres:[YOUR_PASSWORD]@db.${SUPABASE_URL.split('.')[0]}.supabase.co:5432/postgres" -f database/final-app-reviews-schema.sql`);
  
  console.log('\n📋 步骤3: 验证迁移结果');
  console.log('   执行此脚本验证: node scripts/simple-migration.js');
  
  console.log('\n💡 提示:');
  console.log('   如果遇到连接问题，请确保：');
  console.log('   1. Supabase项目处于活跃状态');
  console.log('   2. 数据库密码正确');
  console.log('   3. 网络连接正常');
}

async function main() {
  console.log('🚀 App Reviews 表迁移助手');
  console.log('='.repeat(40));
  
  const needsMigration = await checkTableStatus();
  
  if (!needsMigration) {
    console.log('\n✅ 无需迁移或迁移已完成');
    return;
  }
  
  await manualMigrationSteps();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 脚本执行失败:', error.message);
    process.exit(1);
  });
}
