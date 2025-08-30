-- ========================================
-- Protalk 完整数据库Schema设置脚本
-- 请在Supabase SQL编辑器中执行此脚本
-- ========================================

-- 1. 创建主要的app_reviews表
CREATE TABLE IF NOT EXISTS app_reviews (
    review_id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL,
    app_name TEXT DEFAULT 'Unknown App',
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    title TEXT,
    body TEXT NOT NULL,
    nickname TEXT NOT NULL,
    review_date TIMESTAMPTZ NOT NULL,
    version TEXT DEFAULT '1.0.0',
    country_code TEXT DEFAULT 'CN',
    is_edited BOOLEAN DEFAULT FALSE,
    response_body TEXT,
    response_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建消息映射表
CREATE TABLE IF NOT EXISTS comment_mappings (
    id SERIAL PRIMARY KEY,
    message_id TEXT NOT NULL UNIQUE,
    review_id TEXT NOT NULL,
    app_id TEXT NOT NULL,
    store_type TEXT NOT NULL DEFAULT 'appstore',
    thread_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 创建同步日志表
CREATE TABLE IF NOT EXISTS sync_log (
    app_id TEXT PRIMARY KEY,
    last_sync_time TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 创建性能索引
-- app_reviews表索引
CREATE INDEX IF NOT EXISTS idx_app_reviews_app_id ON app_reviews(app_id);
CREATE INDEX IF NOT EXISTS idx_app_reviews_review_date ON app_reviews(review_date);
CREATE INDEX IF NOT EXISTS idx_app_reviews_rating ON app_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_app_reviews_created_at ON app_reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_app_reviews_app_date ON app_reviews(app_id, review_date);
CREATE INDEX IF NOT EXISTS idx_app_reviews_app_rating ON app_reviews(app_id, rating);
CREATE INDEX IF NOT EXISTS idx_app_reviews_version ON app_reviews(version);
CREATE INDEX IF NOT EXISTS idx_app_reviews_country_code ON app_reviews(country_code);
CREATE INDEX IF NOT EXISTS idx_app_reviews_app_name ON app_reviews(app_name);

-- comment_mappings表索引
CREATE INDEX IF NOT EXISTS idx_comment_mappings_message_id ON comment_mappings(message_id);
CREATE INDEX IF NOT EXISTS idx_comment_mappings_review_id ON comment_mappings(review_id);
CREATE INDEX IF NOT EXISTS idx_comment_mappings_app_id ON comment_mappings(app_id);
CREATE INDEX IF NOT EXISTS idx_comment_mappings_thread_id ON comment_mappings(thread_id);
CREATE INDEX IF NOT EXISTS idx_comment_mappings_app_review ON comment_mappings(app_id, review_id);

-- 5. 创建触发器函数用于自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建触发器
DROP TRIGGER IF EXISTS update_app_reviews_updated_at ON app_reviews;
CREATE TRIGGER update_app_reviews_updated_at 
    BEFORE UPDATE ON app_reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comment_mappings_updated_at ON comment_mappings;
CREATE TRIGGER update_comment_mappings_updated_at 
    BEFORE UPDATE ON comment_mappings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sync_log_updated_at ON sync_log;
CREATE TRIGGER update_sync_log_updated_at 
    BEFORE UPDATE ON sync_log 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. 启用行级安全(RLS)
ALTER TABLE app_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- 8. 创建宽松的安全策略(适用于开发和测试)
-- 注意：生产环境中应该使用更严格的策略

-- app_reviews表策略
DROP POLICY IF EXISTS "Allow all operations on app_reviews" ON app_reviews;
CREATE POLICY "Allow all operations on app_reviews" ON app_reviews
    FOR ALL USING (true);

-- comment_mappings表策略  
DROP POLICY IF EXISTS "Allow all operations on comment_mappings" ON comment_mappings;
CREATE POLICY "Allow all operations on comment_mappings" ON comment_mappings
    FOR ALL USING (true);

-- sync_log表策略
DROP POLICY IF EXISTS "Allow all operations on sync_log" ON sync_log;
CREATE POLICY "Allow all operations on sync_log" ON sync_log
    FOR ALL USING (true);

-- 9. 创建视图用于统计分析(可选)
CREATE OR REPLACE VIEW app_review_stats AS
SELECT 
    app_id,
    app_name,
    COUNT(*) as total_reviews,
    AVG(rating) as average_rating,
    COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_reviews,
    COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_reviews,
    COUNT(CASE WHEN response_body IS NOT NULL THEN 1 END) as replied_reviews,
    MAX(review_date) as latest_review_date,
    MIN(review_date) as earliest_review_date
FROM app_reviews 
GROUP BY app_id, app_name;

-- 10. 插入一些测试数据(可选)
INSERT INTO app_reviews (
    review_id, app_id, app_name, rating, title, body, nickname, 
    review_date, version, country_code, created_at
) VALUES 
(
    'supabase_init_test_001',
    'com.test.app',
    '潮汐 for iOS',
    5,
    'Supabase集成测试',
    '这是一条测试数据，用于验证Supabase数据库集成是否正常工作',
    'Database测试用户',
    NOW(),
    '2.3.4',
    'CN',
    NOW()
)
ON CONFLICT (review_id) DO NOTHING;

-- 11. 验证安装
SELECT 
    'Schema setup completed successfully!' as status,
    'Tables created: app_reviews, comment_mappings, sync_log' as tables,
    'Test data inserted: 1 record' as test_data;

-- 12. 显示表结构确认
SELECT 'app_reviews table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'app_reviews' 
ORDER BY ordinal_position;

SELECT 'comment_mappings table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'comment_mappings' 
ORDER BY ordinal_position;
