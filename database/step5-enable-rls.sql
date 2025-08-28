-- 第五步：启用 RLS 和创建策略
-- 在 Supabase SQL Editor 中执行此脚本

-- 启用行级安全（RLS）
ALTER TABLE app_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略（允许所有操作，实际使用时应该根据需求调整）
DROP POLICY IF EXISTS "Allow all operations on app_reviews" ON app_reviews;
CREATE POLICY "Allow all operations on app_reviews" ON app_reviews
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on sync_log" ON sync_log;
CREATE POLICY "Allow all operations on sync_log" ON sync_log
    FOR ALL USING (true);

-- 验证 RLS 设置
SELECT 'RLS enabled successfully!' as status;
