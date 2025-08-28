-- 专门检查 app_reviews 表
-- 在 Supabase SQL Editor 中执行此脚本

-- 检查 app_reviews 表是否存在
SELECT 
    'app_reviews' as table_name,
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'app_reviews' AND table_schema = 'public') 
        THEN '存在' 
        ELSE '不存在' 
    END as status;

-- 如果表存在，显示其列结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'app_reviews' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 检查表是否有数据
SELECT 
    'app_reviews' as table_name,
    COUNT(*) as row_count
FROM app_reviews;
