-- App Store 评论服务数据库初始化脚本
-- 适用于 Supabase (PostgreSQL)

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

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_app_reviews_app_id ON app_reviews(app_id);
CREATE INDEX IF NOT EXISTS idx_app_reviews_review_date ON app_reviews(review_date);
CREATE INDEX IF NOT EXISTS idx_app_reviews_rating ON app_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_app_reviews_created_at ON app_reviews(created_at);

-- 创建复合索引
CREATE INDEX IF NOT EXISTS idx_app_reviews_app_date ON app_reviews(app_id, review_date);
CREATE INDEX IF NOT EXISTS idx_app_reviews_app_rating ON app_reviews(app_id, rating);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为 app_reviews 表创建更新时间触发器
DROP TRIGGER IF EXISTS update_app_reviews_updated_at ON app_reviews;
CREATE TRIGGER update_app_reviews_updated_at 
    BEFORE UPDATE ON app_reviews 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 为 sync_log 表创建更新时间触发器
DROP TRIGGER IF EXISTS update_sync_log_updated_at ON sync_log;
CREATE TRIGGER update_sync_log_updated_at 
    BEFORE UPDATE ON sync_log 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 创建统计视图
CREATE OR REPLACE VIEW app_review_stats AS
SELECT 
    app_id,
    COUNT(*) as total_reviews,
    AVG(rating) as avg_rating,
    COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_count,
    COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star_count,
    COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star_count,
    COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star_count,
    COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_count,
    COUNT(CASE WHEN response_body IS NOT NULL THEN 1 END) as replied_count,
    MAX(review_date) as latest_review_date,
    MIN(review_date) as earliest_review_date
FROM app_reviews
GROUP BY app_id;

-- 创建最近评论视图
CREATE OR REPLACE VIEW recent_reviews AS
SELECT 
    review_id,
    app_id,
    rating,
    title,
    body,
    nickname,
    review_date,
    is_edited,
    response_body,
    response_date,
    created_at
FROM app_reviews
ORDER BY review_date DESC
LIMIT 100;

-- 插入示例数据（可选）
-- INSERT INTO app_reviews (review_id, app_id, rating, title, body, nickname, review_date) VALUES
-- ('sample_review_1', '123456789', 5, '很好的应用', '这个应用非常好用，界面简洁，功能强大。', '用户A', NOW() - INTERVAL '1 day'),
-- ('sample_review_2', '123456789', 4, '不错', '整体不错，但还有一些小问题需要改进。', '用户B', NOW() - INTERVAL '2 days');

-- 创建权限（如果需要）
-- GRANT SELECT, INSERT, UPDATE ON app_reviews TO anon;
-- GRANT SELECT, INSERT, UPDATE ON sync_log TO anon;
-- GRANT SELECT ON app_review_stats TO anon;
-- GRANT SELECT ON recent_reviews TO anon;

-- 启用行级安全（RLS）
ALTER TABLE app_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略（允许所有操作，实际使用时应该根据需求调整）
CREATE POLICY "Allow all operations on app_reviews" ON app_reviews
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on sync_log" ON sync_log
    FOR ALL USING (true);

-- 创建函数用于获取应用统计信息
CREATE OR REPLACE FUNCTION get_app_stats(p_app_id TEXT)
RETURNS TABLE (
    total_reviews BIGINT,
    avg_rating NUMERIC,
    five_star_count BIGINT,
    four_star_count BIGINT,
    three_star_count BIGINT,
    two_star_count BIGINT,
    one_star_count BIGINT,
    replied_count BIGINT,
    latest_review_date TIMESTAMPTZ,
    earliest_review_date TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_reviews,
        AVG(rating)::NUMERIC as avg_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END)::BIGINT as five_star_count,
        COUNT(CASE WHEN rating = 4 THEN 1 END)::BIGINT as four_star_count,
        COUNT(CASE WHEN rating = 3 THEN 1 END)::BIGINT as three_star_count,
        COUNT(CASE WHEN rating = 2 THEN 1 END)::BIGINT as two_star_count,
        COUNT(CASE WHEN rating = 1 THEN 1 END)::BIGINT as one_star_count,
        COUNT(CASE WHEN response_body IS NOT NULL THEN 1 END)::BIGINT as replied_count,
        MAX(review_date) as latest_review_date,
        MIN(review_date) as earliest_review_date
    FROM app_reviews
    WHERE app_id = p_app_id;
END;
$$ LANGUAGE plpgsql;
