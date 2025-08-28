-- 第二步：创建索引（简化版本）
-- 在 Supabase SQL Editor 中执行此脚本

-- 创建基本索引
CREATE INDEX IF NOT EXISTS idx_app_reviews_app_id ON app_reviews(app_id);

-- 验证索引创建
SELECT 'Basic index created successfully!' as status;
