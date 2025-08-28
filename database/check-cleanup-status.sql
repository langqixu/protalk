-- 检查数据库清理状态
-- 查询所有相关表的信息

-- 1. 检查所有app_reviews相关表
SELECT 
    table_name,
    table_type,
    'app_reviews相关表' as category
FROM information_schema.tables 
WHERE table_name LIKE '%app_reviews%' 
    AND table_schema = 'public'
ORDER BY table_name;

-- 2. 检查当前app_reviews表结构
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'app_reviews' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. 检查app_reviews表记录数
SELECT 
    'app_reviews' as table_name,
    COUNT(*) as record_count
FROM app_reviews;

-- 4. 检查备份表记录数（如果存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_reviews_old') THEN
        RAISE NOTICE 'app_reviews_old表存在';
        PERFORM COUNT(*) FROM app_reviews_old;
    ELSE
        RAISE NOTICE 'app_reviews_old表不存在';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_reviews_backup_manual') THEN
        RAISE NOTICE 'app_reviews_backup_manual表存在';
    ELSE
        RAISE NOTICE 'app_reviews_backup_manual表不存在';
    END IF;
END $$;

-- 5. 检查索引状态
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename LIKE '%app_reviews%'
    AND schemaname = 'public'
ORDER BY tablename, indexname;
