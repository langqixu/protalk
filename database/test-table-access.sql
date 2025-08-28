-- 简单的表访问测试
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 检查表是否存在
SELECT 
    'app_reviews' as table_name,
    EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'app_reviews' AND table_schema = 'public') as exists;

-- 2. 显示所有列名
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'app_reviews' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. 尝试简单的 SELECT
SELECT 'Simple select test' as test;
SELECT COUNT(*) FROM app_reviews;
