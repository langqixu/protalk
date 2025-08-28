-- 重新创建 app_reviews 表
-- 在 Supabase SQL Editor 中执行此脚本

-- 删除表（如果存在）
DROP TABLE IF EXISTS app_reviews CASCADE;

-- 重新创建 app_reviews 表
CREATE TABLE app_reviews (
    review_id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    title TEXT,
    body TEXT NOT NULL,
    nickname TEXT NOT NULL,
    review_date TIMESTAMPTZ NOT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    response_body TEXT,
    response_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 验证表创建
SELECT 
    'app_reviews' as table_name,
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'app_reviews' AND table_schema = 'public') 
        THEN '创建成功' 
        ELSE '创建失败' 
    END as status;

-- 显示表结构
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'app_reviews' 
AND table_schema = 'public'
ORDER BY ordinal_position;
