#!/usr/bin/env node

/**
 * 数据库迁移执行脚本
 * 使用项目现有的Supabase连接执行app_reviews表结构升级
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 从环境变量加载配置
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 缺少必需的环境变量：SUPABASE_URL 或 SUPABASE_ANON_KEY');
  process.exit(1);
}

// 创建Supabase客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 直接使用psql执行SQL文件
 */
async function executeSqlFile(filePath, description) {
  console.log(`📋 正在执行: ${description}`);
  
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    
    // 构建psql命令
    const args = [
      process.env.SUPABASE_URL || process.env.DATABASE_URL,
      '-f', filePath
    ];
    
    const psql = spawn('psql', args);
    
    let output = '';
    let errorOutput = '';
    
    psql.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    psql.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    psql.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ 执行成功: ${description}`);
        resolve(output);
      } else {
        console.error(`❌ 执行失败: ${description}`);
        console.error('错误输出:', errorOutput);
        reject(new Error(`psql退出码: ${code}`));
      }
    });
  });
}

/**
 * 检查表是否存在
 */
async function checkTableExists(tableName) {
  try {
    // 简单地尝试查询表，如果表不存在会返回错误
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    // 如果没有错误，表存在
    return !error;
  } catch (error) {
    console.error('❌ 检查表存在性异常:', error.message);
    return false;
  }
}

/**
 * 获取表记录数
 */
async function getTableCount(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`❌ 获取${tableName}记录数失败:`, error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error(`❌ 获取${tableName}记录数异常:`, error.message);
    return 0;
  }
}

/**
 * 执行数据库迁移的主函数
 */
async function executeMigration() {
  console.log('🚀 开始执行app_reviews表结构升级迁移');
  console.log('='.repeat(60));
  
  try {
    // 阶段1: 检查当前状态
    console.log('\n📊 阶段1: 检查当前状态');
    const hasAppReviews = await checkTableExists('app_reviews');
    if (!hasAppReviews) {
      console.error('❌ app_reviews表不存在，请先确认数据库状态');
      process.exit(1);
    }
    
    const currentCount = await getTableCount('app_reviews');
    console.log(`✅ 当前app_reviews表记录数: ${currentCount}`);
    
    // 阶段2: 创建备份
    console.log('\n💾 阶段2: 创建数据备份');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupTableName = `app_reviews_backup_${timestamp}`;
    
    await executeSql(
      `CREATE TABLE ${backupTableName} AS SELECT * FROM app_reviews`,
      `创建备份表 ${backupTableName}`
    );
    
    const backupCount = await getTableCount(backupTableName);
    console.log(`✅ 备份表创建成功，记录数: ${backupCount}`);
    
    // 阶段3: 创建新表结构
    console.log('\n🏗️  阶段3: 创建新表结构');
    const newTableSql = `
      CREATE TABLE app_reviews_new (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id VARCHAR(255) UNIQUE NOT NULL,
        app_id VARCHAR(255) NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title TEXT,
        body TEXT,
        reviewer_nickname VARCHAR(255) NOT NULL,
        created_date TIMESTAMP NOT NULL,
        is_edited BOOLEAN NOT NULL DEFAULT FALSE,
        response_body TEXT,
        response_date TIMESTAMP,
        data_type VARCHAR(20) NOT NULL DEFAULT 'review' 
            CHECK (data_type IN ('review', 'rating_only')),
        first_sync_at TIMESTAMP DEFAULT NOW(),
        is_pushed BOOLEAN DEFAULT FALSE,
        push_type VARCHAR(20) CHECK (push_type IN ('new', 'historical', 'updated')),
        territory_code VARCHAR(10),
        app_version VARCHAR(50),
        review_state VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    await executeSql(newTableSql, '创建新表结构 app_reviews_new');
    
    // 阶段4: 创建索引
    console.log('\n📇 阶段4: 创建索引');
    const indexes = [
      'CREATE INDEX idx_app_reviews_new_review_id ON app_reviews_new(review_id)',
      'CREATE INDEX idx_app_reviews_new_app_id ON app_reviews_new(app_id)',
      'CREATE INDEX idx_app_reviews_new_rating ON app_reviews_new(rating)',
      'CREATE INDEX idx_app_reviews_new_created_date ON app_reviews_new(created_date)',
      'CREATE INDEX idx_app_reviews_new_data_type ON app_reviews_new(data_type)',
      'CREATE INDEX idx_app_reviews_new_is_pushed ON app_reviews_new(is_pushed)',
      'CREATE INDEX idx_app_reviews_new_app_date ON app_reviews_new(app_id, created_date)',
      'CREATE INDEX idx_app_reviews_new_app_type ON app_reviews_new(app_id, data_type)'
    ];
    
    for (const indexSql of indexes) {
      await executeSql(indexSql, '创建索引');
    }
    
    // 阶段5: 数据迁移
    console.log('\n📦 阶段5: 数据迁移');
    const migrationSql = `
      INSERT INTO app_reviews_new (
        review_id, app_id, rating, title, body, reviewer_nickname,
        created_date, is_edited, response_body, response_date,
        data_type, first_sync_at, is_pushed, push_type,
        created_at, updated_at
      )
      SELECT 
        review_id, app_id, rating, title, body, nickname as reviewer_nickname,
        review_date as created_date, is_edited, response_body, response_date,
        CASE 
          WHEN body IS NOT NULL AND TRIM(body) != '' THEN 'review'
          ELSE 'rating_only'
        END as data_type,
        created_at as first_sync_at,
        TRUE as is_pushed,
        'historical' as push_type,
        created_at, updated_at
      FROM app_reviews
    `;
    
    await executeSql(migrationSql, '迁移数据到新表');
    
    const newTableCount = await getTableCount('app_reviews_new');
    console.log(`✅ 数据迁移完成，新表记录数: ${newTableCount}`);
    
    // 阶段6: 验证数据
    console.log('\n🔍 阶段6: 验证数据完整性');
    if (currentCount !== newTableCount) {
      throw new Error(`数据验证失败：原表${currentCount}条，新表${newTableCount}条`);
    }
    console.log('✅ 数据完整性验证通过');
    
    // 阶段7: 表替换
    console.log('\n🔄 阶段7: 执行表替换');
    await executeSql('ALTER TABLE app_reviews RENAME TO app_reviews_old', '重命名原表为旧表');
    await executeSql('ALTER TABLE app_reviews_new RENAME TO app_reviews', '重命名新表为正式表');
    
    // 阶段8: 重命名索引
    console.log('\n📇 阶段8: 重命名索引');
    const indexRenames = [
      'ALTER INDEX idx_app_reviews_new_review_id RENAME TO idx_app_reviews_review_id',
      'ALTER INDEX idx_app_reviews_new_app_id RENAME TO idx_app_reviews_app_id',
      'ALTER INDEX idx_app_reviews_new_rating RENAME TO idx_app_reviews_rating',
      'ALTER INDEX idx_app_reviews_new_created_date RENAME TO idx_app_reviews_created_date',
      'ALTER INDEX idx_app_reviews_new_data_type RENAME TO idx_app_reviews_data_type',
      'ALTER INDEX idx_app_reviews_new_is_pushed RENAME TO idx_app_reviews_is_pushed',
      'ALTER INDEX idx_app_reviews_new_app_date RENAME TO idx_app_reviews_app_date',
      'ALTER INDEX idx_app_reviews_new_app_type RENAME TO idx_app_reviews_app_type'
    ];
    
    for (const renameSql of indexRenames) {
      await executeSql(renameSql, '重命名索引');
    }
    
    // 阶段9: 最终验证
    console.log('\n✅ 阶段9: 最终验证');
    const finalCount = await getTableCount('app_reviews');
    console.log(`✅ 最终表记录数: ${finalCount}`);
    
    // 显示数据类型分布
    const { data: typeDistribution } = await supabase
      .from('app_reviews')
      .select('data_type')
      .then(result => {
        if (result.error) throw result.error;
        const dist = {};
        result.data.forEach(row => {
          dist[row.data_type] = (dist[row.data_type] || 0) + 1;
        });
        return { data: dist };
      });
    
    console.log('📊 数据类型分布:');
    console.log(`   完整评论: ${typeDistribution.review || 0}`);
    console.log(`   纯评分: ${typeDistribution.rating_only || 0}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 数据库迁移执行完成！');
    console.log('📋 后续步骤：');
    console.log('   1. 测试应用功能确保正常运行');
    console.log('   2. 观察1-2天确认稳定性');
    console.log('   3. 确认无误后可删除备份表');
    console.log('📈 新功能：');
    console.log('   - 使用API原始字段命名');
    console.log('   - 自动区分评论和纯评分');
    console.log('   - 支持更精确的变更检测');
    console.log('   - 为未来扩展预留字段');
    
  } catch (error) {
    console.error('\n❌ 迁移过程中发生错误:', error.message);
    console.log('\n🛠️  回滚建议：');
    console.log('   如果表替换已完成但出现问题，可执行：');
    console.log('   1. ALTER TABLE app_reviews RENAME TO app_reviews_failed;');
    console.log('   2. ALTER TABLE app_reviews_old RENAME TO app_reviews;');
    process.exit(1);
  }
}

// 执行迁移
if (require.main === module) {
  executeMigration().catch(error => {
    console.error('❌ 迁移脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { executeMigration };
