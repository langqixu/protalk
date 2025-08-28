-- 第一步：创建表
-- 在 Supabase SQL Editor 中执行此脚本

-- 创建评论表
CREATE TABLE IF NOT EXISTS app_reviews (
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

-- 创建同步日志表
CREATE TABLE IF NOT EXISTS sync_log (
    app_id TEXT PRIMARY KEY,
    last_sync_time TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 验证表创建
SELECT 'Tables created successfully!' as status;
