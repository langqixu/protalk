#!/usr/bin/env node

/**
 * 分步执行数据库迁移
 * 使用Supabase客户端的raw SQL功能
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function executeStep(description, sqlCommand) {
  console.log(`📋 ${description}...`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query: sqlCommand });
    if (error) {
      console.error(`❌ 失败:`, error);
      return false;
    }
    console.log(`✅ 成功: ${description}`);
    return true;
  } catch (error) {
    // 如果rpc不可用，尝试其他方法
    console.log(`⚠️  RPC方法不可用，需要手动执行`);
    return false;
  }
}

async function stepByStepMigration() {
  console.log('🚀 分步执行数据库迁移');
  console.log('='.repeat(50));
  
  // 检查当前表状态
  console.log('📊 检查当前状态...');
  const { data: currentData, error: currentError } = await supabase
    .from('app_reviews')
    .select('*')
    .limit(1);
  
  if (currentError) {
    console.error('❌ 无法访问app_reviews表:', currentError);
    return;
  }
  
  console.log('✅ 当前表存在，字段:', Object.keys(currentData[0] || {}));
  
  // 检查是否已经迁移
  if (currentData[0] && currentData[0].hasOwnProperty('reviewer_nickname')) {
    console.log('✅ 表已经是新结构，无需迁移');
    return;
  }
  
  console.log('\n📋 需要执行迁移，准备迁移步骤...');
  
  // 尝试执行迁移步骤
  const steps = [
    {
      description: '创建备份表',
      sql: `CREATE TABLE app_reviews_backup_${Date.now()} AS SELECT * FROM app_reviews`
    },
    {
      description: '创建新表结构',
      sql: `CREATE TABLE app_reviews_new (
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
        data_type VARCHAR(20) NOT NULL DEFAULT 'review',
        first_sync_at TIMESTAMP DEFAULT NOW(),
        is_pushed BOOLEAN DEFAULT FALSE,
        push_type VARCHAR(20),
        territory_code VARCHAR(10),
        app_version VARCHAR(50),
        review_state VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`
    }
  ];
  
  let canExecute = true;
  for (const step of steps) {
    const success = await executeStep(step.description, step.sql);
    if (!success) {
      canExecute = false;
      break;
    }
  }
  
  if (!canExecute) {
    console.log('\n⚠️  无法自动执行SQL命令');
    console.log('📋 请手动在Supabase Dashboard中执行以下操作：');
    console.log('\n1. 访问 https://supabase.com/dashboard');
    console.log('2. 转到你的项目');
    console.log('3. 打开 SQL Editor');
    console.log('4. 执行以下完整的迁移SQL：\n');
    
    // 显示完整的SQL
    const completeSql = `
-- 数据库迁移脚本
BEGIN;

-- 1. 创建备份
CREATE TABLE app_reviews_backup_manual AS SELECT * FROM app_reviews;

-- 2. 创建新表
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
);

-- 3. 创建索引
CREATE INDEX idx_app_reviews_new_review_id ON app_reviews_new(review_id);
CREATE INDEX idx_app_reviews_new_app_id ON app_reviews_new(app_id);
CREATE INDEX idx_app_reviews_new_rating ON app_reviews_new(rating);
CREATE INDEX idx_app_reviews_new_created_date ON app_reviews_new(created_date);
CREATE INDEX idx_app_reviews_new_data_type ON app_reviews_new(data_type);
CREATE INDEX idx_app_reviews_new_is_pushed ON app_reviews_new(is_pushed);
CREATE INDEX idx_app_reviews_new_app_date ON app_reviews_new(app_id, created_date);
CREATE INDEX idx_app_reviews_new_app_type ON app_reviews_new(app_id, data_type);

-- 4. 迁移数据
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
FROM app_reviews;

-- 5. 验证数据
SELECT 
    (SELECT COUNT(*) FROM app_reviews) as original_count,
    (SELECT COUNT(*) FROM app_reviews_new) as new_count,
    (SELECT COUNT(*) FROM app_reviews_new WHERE data_type = 'review') as review_count,
    (SELECT COUNT(*) FROM app_reviews_new WHERE data_type = 'rating_only') as rating_only_count;

-- 如果验证通过，执行表替换
ALTER TABLE app_reviews RENAME TO app_reviews_old;
ALTER TABLE app_reviews_new RENAME TO app_reviews;

-- 重命名索引
ALTER INDEX idx_app_reviews_new_review_id RENAME TO idx_app_reviews_review_id;
ALTER INDEX idx_app_reviews_new_app_id RENAME TO idx_app_reviews_app_id;
ALTER INDEX idx_app_reviews_new_rating RENAME TO idx_app_reviews_rating;
ALTER INDEX idx_app_reviews_new_created_date RENAME TO idx_app_reviews_created_date;
ALTER INDEX idx_app_reviews_new_data_type RENAME TO idx_app_reviews_data_type;
ALTER INDEX idx_app_reviews_new_is_pushed RENAME TO idx_app_reviews_is_pushed;
ALTER INDEX idx_app_reviews_new_app_date RENAME TO idx_app_reviews_app_date;
ALTER INDEX idx_app_reviews_new_app_type RENAME TO idx_app_reviews_app_type;

COMMIT;

-- 验证迁移结果
SELECT 'Migration completed!' as status;
SELECT 
    data_type,
    COUNT(*) as count,
    AVG(rating) as avg_rating
FROM app_reviews 
GROUP BY data_type;
`;
    
    console.log(completeSql);
    console.log('\n5. 执行后运行验证: node scripts/simple-migration.js');
  }
}

if (require.main === module) {
  stepByStepMigration().catch(error => {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  });
}
