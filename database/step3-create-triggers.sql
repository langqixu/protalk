-- 第三步：创建触发器和函数
-- 在 Supabase SQL Editor 中执行此脚本

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 app_reviews 表创建更新时间触发器
DROP TRIGGER IF EXISTS update_app_reviews_updated_at ON app_reviews;
CREATE TRIGGER update_app_reviews_updated_at 
    BEFORE UPDATE ON app_reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 为 sync_log 表创建更新时间触发器
DROP TRIGGER IF EXISTS update_sync_log_updated_at ON sync_log;
CREATE TRIGGER update_sync_log_updated_at 
    BEFORE UPDATE ON sync_log 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 验证触发器创建
SELECT 'Triggers created successfully!' as status;
