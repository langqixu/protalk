-- 验证表结构
-- 在 Supabase SQL Editor 中执行此脚本

-- 检查表是否存在
SELECT 
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '存在'
        ELSE '不存在'
    END as status
FROM information_schema.tables 
WHERE table_name IN ('app_reviews', 'sync_log')
AND table_schema = 'public';

-- 检查 app_reviews 表的列结构
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'app_reviews' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 检查 sync_log 表的列结构
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'sync_log' 
AND table_schema = 'public'
ORDER BY ordinal_position;
