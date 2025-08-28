-- 修复 app_reviews 表结构
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 添加缺失的 app_id 列
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'app_id' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE app_reviews ADD COLUMN app_id TEXT NOT NULL DEFAULT '';
        RAISE NOTICE '已添加 app_id 列';
    ELSE
        RAISE NOTICE 'app_id 列已存在';
    END IF;
END $$;

-- 2. 添加缺失的 is_edited 列
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'is_edited' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE app_reviews ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '已添加 is_edited 列';
    ELSE
        RAISE NOTICE 'is_edited 列已存在';
    END IF;
END $$;

-- 3. 验证修复后的表结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'app_reviews' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. 尝试创建索引
CREATE INDEX IF NOT EXISTS idx_app_reviews_app_id ON app_reviews(app_id);
CREATE INDEX IF NOT EXISTS idx_app_reviews_review_date ON app_reviews(review_date);
CREATE INDEX IF NOT EXISTS idx_app_reviews_rating ON app_reviews(rating);

-- 5. 验证索引创建
SELECT 'Indexes created successfully!' as status;
