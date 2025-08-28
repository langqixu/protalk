-- 数据库清理脚本
-- 清理迁移过程中产生的临时表和备份表

-- ⚠️ 警告：执行前请确认你已经验证新的app_reviews表工作正常
-- ⚠️ 建议分步执行，每次执行一个DROP语句

-- 1. 检查要清理的表
SELECT 
    table_name,
    'EXISTS' as status,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
FROM information_schema.tables 
WHERE table_name IN (
    'app_reviews_old',
    'app_reviews_backup_manual',
    'app_reviews_new',
    'app_feedback'
) AND table_schema = 'public';

-- 2. 检查当前app_reviews表状态（确保正常）
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT review_id) as unique_reviews,
    COUNT(CASE WHEN data_type = 'review' THEN 1 END) as review_count,
    COUNT(CASE WHEN data_type = 'rating_only' THEN 1 END) as rating_only_count
FROM app_reviews;

-- 3. 清理步骤（请逐个执行）：

-- 步骤A：删除旧表（迁移前的表）
-- DROP TABLE IF EXISTS app_reviews_old CASCADE;

-- 步骤B：删除手动备份表（迁移时创建的备份）
-- DROP TABLE IF EXISTS app_reviews_backup_manual CASCADE;

-- 步骤C：删除可能残留的新表（如果存在）
-- DROP TABLE IF EXISTS app_reviews_new CASCADE;

-- 步骤D：删除未使用的app_feedback表（如果存在）
-- DROP TABLE IF EXISTS app_feedback CASCADE;

-- 4. 最终验证：确保只保留我们需要的表
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name LIKE '%app_%' AND table_schema = 'public';
