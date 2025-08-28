-- 第二步：创建索引
-- 在 Supabase SQL Editor 中执行此脚本

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
