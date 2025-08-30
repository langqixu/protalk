-- 更新数据库Schema以支持卡片集成
-- 添加缺失的字段来完整支持ReviewDTO映射

-- 1. 添加version字段 (应用版本)
ALTER TABLE app_reviews 
ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0.0';

-- 2. 添加country_code字段 (国家代码)
ALTER TABLE app_reviews 
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'CN';

-- 3. 添加app_name字段 (应用名称，避免硬编码)
ALTER TABLE app_reviews 
ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT 'Unknown App';

-- 4. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_app_reviews_version ON app_reviews(version);
CREATE INDEX IF NOT EXISTS idx_app_reviews_country_code ON app_reviews(country_code);
CREATE INDEX IF NOT EXISTS idx_app_reviews_app_name ON app_reviews(app_name);

-- 5. 确保comment_mappings表存在
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

-- 创建comment_mappings索引
CREATE INDEX IF NOT EXISTS idx_comment_mappings_message_id ON comment_mappings(message_id);
CREATE INDEX IF NOT EXISTS idx_comment_mappings_review_id ON comment_mappings(review_id);
CREATE INDEX IF NOT EXISTS idx_comment_mappings_app_id ON comment_mappings(app_id);

-- 6. 启用RLS (如果需要)
ALTER TABLE app_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_mappings ENABLE ROW LEVEL SECURITY;

-- 7. 创建简单的策略允许所有操作 (测试用)
DROP POLICY IF EXISTS "Allow all operations on app_reviews" ON app_reviews;
CREATE POLICY "Allow all operations on app_reviews" ON app_reviews
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on comment_mappings" ON comment_mappings;  
CREATE POLICY "Allow all operations on comment_mappings" ON comment_mappings
    FOR ALL USING (true);

-- 8. 验证表结构
SELECT 'Schema update completed successfully!' as status;

-- 9. 显示更新后的表结构
\d app_reviews;
\d comment_mappings;
