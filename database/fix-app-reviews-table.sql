-- 修复 app_reviews 表
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 检查 app_id 列是否存在
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'app_id' 
        AND table_schema = 'public'
    ) THEN
        -- 如果 app_id 列不存在，添加它
        ALTER TABLE app_reviews ADD COLUMN app_id TEXT NOT NULL DEFAULT '';
        RAISE NOTICE '已添加 app_id 列';
    ELSE
        RAISE NOTICE 'app_id 列已存在';
    END IF;
END $$;

-- 2. 验证修复结果
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'app_reviews' 
AND table_schema = 'public'
AND column_name = 'app_id';

-- 3. 显示所有列
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'app_reviews' 
AND table_schema = 'public'
ORDER BY ordinal_position;
