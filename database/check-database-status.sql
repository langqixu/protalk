-- 数据库状态检查脚本
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 检查表是否存在
SELECT 
    'Tables' as check_type,
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ 存在'
        ELSE '❌ 不存在'
    END as status
FROM information_schema.tables 
WHERE table_name IN ('app_reviews', 'sync_log')
AND table_schema = 'public';

-- 2. 检查视图是否存在
SELECT 
    'Views' as check_type,
    table_name as view_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ 存在'
        ELSE '❌ 不存在'
    END as status
FROM information_schema.views 
WHERE table_name IN ('app_review_stats', 'recent_reviews')
AND table_schema = 'public';

-- 3. 检查索引
SELECT 
    'Indexes' as check_type,
    indexname,
    CASE 
        WHEN indexname IS NOT NULL THEN '✅ 存在'
        ELSE '❌ 不存在'
    END as status
FROM pg_indexes 
WHERE tablename IN ('app_reviews', 'sync_log')
AND schemaname = 'public';

-- 4. 检查触发器
SELECT 
    'Triggers' as check_type,
    trigger_name,
    CASE 
        WHEN trigger_name IS NOT NULL THEN '✅ 存在'
        ELSE '❌ 不存在'
    END as status
FROM information_schema.triggers 
WHERE trigger_name LIKE '%updated_at%'
AND event_object_schema = 'public';

-- 5. 检查函数
SELECT 
    'Functions' as check_type,
    routine_name,
    CASE 
        WHEN routine_name IS NOT NULL THEN '✅ 存在'
        ELSE '❌ 不存在'
    END as status
FROM information_schema.routines 
WHERE routine_name = 'update_updated_at_column'
AND routine_schema = 'public';

-- 6. 检查 RLS 策略
SELECT 
    'RLS Policies' as check_type,
    policyname,
    CASE 
        WHEN policyname IS NOT NULL THEN '✅ 存在'
        ELSE '❌ 不存在'
    END as status
FROM pg_policies 
WHERE tablename IN ('app_reviews', 'sync_log')
AND schemaname = 'public';

-- 7. 检查数据量
SELECT 
    'Data Count' as check_type,
    'app_reviews' as table_name,
    COUNT(*) as record_count
FROM app_reviews
UNION ALL
SELECT 
    'Data Count' as check_type,
    'sync_log' as table_name,
    COUNT(*) as record_count
FROM sync_log;

-- 8. 检查最近的同步记录
SELECT 
    'Recent Sync' as check_type,
    app_id,
    last_sync_time,
    CASE 
        WHEN last_sync_time > NOW() - INTERVAL '1 day' THEN '✅ 最近同步'
        WHEN last_sync_time > NOW() - INTERVAL '7 days' THEN '⚠️ 一周内同步'
        ELSE '❌ 长期未同步'
    END as sync_status
FROM sync_log
ORDER BY last_sync_time DESC
LIMIT 5;
