-- 检查 app_id 列
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 检查 app_id 列是否存在
SELECT 
    'app_id' as column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'app_id' 
        AND table_schema = 'public'
    ) as exists;

-- 2. 显示所有列名
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'app_reviews' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. 尝试在 app_id 列上创建索引（如果列存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'app_id' 
        AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_app_reviews_app_id ON app_reviews(app_id);
        RAISE NOTICE 'app_id 索引创建成功';
    ELSE
        RAISE NOTICE 'app_id 列不存在，无法创建索引';
    END IF;
END $$;
