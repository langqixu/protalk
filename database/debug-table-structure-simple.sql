-- 简化版表结构调试
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 检查表是否存在
SELECT 
    'app_reviews' as table_name,
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'app_reviews' AND table_schema = 'public') 
        THEN '存在' 
        ELSE '不存在' 
    END as status;

-- 2. 显示所有列名（包括大小写）
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'app_reviews' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. 检查是否有类似的列名
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'app_reviews' 
AND table_schema = 'public'
AND (
    column_name ILIKE '%app%' 
    OR column_name ILIKE '%id%'
    OR column_name ILIKE '%appid%'
    OR column_name ILIKE '%app_id%'
);

-- 4. 尝试查询表（如果列存在的话）
SELECT 
    'Testing table access' as test,
    CASE 
        WHEN EXISTS (SELECT 1 FROM app_reviews LIMIT 1) 
        THEN '表可以正常访问' 
        ELSE '表访问有问题' 
    END as result;
