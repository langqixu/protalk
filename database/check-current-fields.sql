-- 检查当前数据库实际字段状态
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 显示 app_reviews 表的所有字段
SELECT 
    '=== 当前 app_reviews 表结构 ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'app_reviews' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. 检查交互功能相关字段是否存在
SELECT 
    '=== 交互功能字段检查 ===' as info;

SELECT 
    'feishu_message_id' as field_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'feishu_message_id' 
        AND table_schema = 'public'
    ) as exists

UNION ALL

SELECT 
    'app_version' as field_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'app_version' 
        AND table_schema = 'public'
    ) as exists

UNION ALL

SELECT 
    'territory_code' as field_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'territory_code' 
        AND table_schema = 'public'
    ) as exists

UNION ALL

SELECT 
    'card_state' as field_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'card_state' 
        AND table_schema = 'public'
    ) as exists;

-- 3. 检查回复功能核心字段
SELECT 
    '=== 回复功能核心字段检查 ===' as info;

SELECT 
    'response_body' as field_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'response_body' 
        AND table_schema = 'public'
    ) as exists

UNION ALL

SELECT 
    'response_date' as field_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'response_date' 
        AND table_schema = 'public'
    ) as exists;

-- 4. 检查相关表是否存在
SELECT 
    '=== 相关表检查 ===' as info;

SELECT 
    'app_reviews' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'app_reviews' 
        AND table_schema = 'public'
    ) as exists

UNION ALL

SELECT 
    'comment_mappings' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'comment_mappings' 
        AND table_schema = 'public'
    ) as exists

UNION ALL

SELECT 
    'review_issue_reports' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'review_issue_reports' 
        AND table_schema = 'public'
    ) as exists;

-- 5. 检查现有数据量
SELECT 
    '=== 数据量统计 ===' as info;

SELECT 
    'app_reviews' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN response_body IS NOT NULL THEN 1 END) as has_reply_count
FROM app_reviews;

SELECT '数据库状态检查完成！' as result;
