-- 第二步：创建索引（安全版本）
-- 在 Supabase SQL Editor 中执行此脚本

-- 首先验证表是否存在
DO $$
BEGIN
    -- 检查 app_reviews 表是否存在
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'app_reviews') THEN
        RAISE EXCEPTION 'app_reviews 表不存在，请先执行步骤1创建表';
    END IF;
    
    -- 检查 sync_log 表是否存在
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sync_log') THEN
        RAISE EXCEPTION 'sync_log 表不存在，请先执行步骤1创建表';
    END IF;
    
    RAISE NOTICE '表验证通过，开始创建索引...';
END $$;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_app_reviews_app_id ON app_reviews(app_id);
CREATE INDEX IF NOT EXISTS idx_app_reviews_review_date ON app_reviews(review_date);
CREATE INDEX IF NOT EXISTS idx_app_reviews_rating ON app_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_app_reviews_created_at ON app_reviews(created_at);

-- 创建复合索引
CREATE INDEX IF NOT EXISTS idx_app_reviews_app_date ON app_reviews(app_id, review_date);
CREATE INDEX IF NOT EXISTS idx_app_reviews_app_rating ON app_reviews(app_id, rating);

-- 验证索引创建
SELECT 'Indexes created successfully!' as status;
