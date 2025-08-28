-- 数据迁移脚本：将现有app_reviews数据迁移到新的app_feedback表

-- 1. 检查现有数据
-- SELECT COUNT(*) as existing_reviews FROM app_reviews;

-- 2. 迁移现有app_reviews数据到app_feedback表
INSERT INTO app_feedback (
    feedback_id,
    app_id,
    type,
    rating,
    user_nickname,
    feedback_date,
    title,
    body,
    is_edited,
    developer_response,
    developer_response_date,
    first_sync_at,
    is_pushed,
    push_type,
    created_at,
    updated_at
)
SELECT 
    review_id as feedback_id,
    app_id,
    'review' as type,                    -- 现有数据都是评论类型
    rating,
    nickname as user_nickname,
    review_date as feedback_date,
    title,
    body,
    is_edited,
    response_body as developer_response,
    response_date as developer_response_date,
    created_at as first_sync_at,         -- 假设创建时间为首次同步时间
    TRUE as is_pushed,                   -- 现有数据标记为已推送
    'historical' as push_type,           -- 现有数据标记为历史数据
    created_at,
    updated_at
FROM app_reviews
WHERE NOT EXISTS (
    SELECT 1 FROM app_feedback 
    WHERE app_feedback.feedback_id = app_reviews.review_id
);

-- 3. 验证迁移结果
-- SELECT 
--     'app_reviews' as table_name, COUNT(*) as count 
-- FROM app_reviews
-- UNION ALL
-- SELECT 
--     'app_feedback' as table_name, COUNT(*) as count 
-- FROM app_feedback
-- UNION ALL
-- SELECT 
--     'app_feedback_reviews' as table_name, COUNT(*) as count 
-- FROM app_feedback WHERE type = 'review';

-- 4. 更新sync_log表中的相关记录（如果需要）
-- UPDATE sync_log 
-- SET last_review_count = (
--     SELECT COUNT(*) FROM app_feedback 
--     WHERE app_id = sync_log.app_id AND type = 'review'
-- )
-- WHERE sync_type = 'reviews' OR sync_type IS NULL;

-- 5. 生成初始的每日统计数据（最近30天）
-- 这个操作可能比较耗时，建议在低峰期执行
INSERT INTO app_rating_daily_stats (
    app_id,
    stat_date,
    total_ratings,
    total_reviews,
    average_rating,
    rating_1_count,
    rating_2_count,
    rating_3_count,
    rating_4_count,
    rating_5_count,
    is_report_sent
)
SELECT 
    app_id,
    date_val as stat_date,
    stats.total_ratings,
    stats.total_reviews,
    stats.average_rating,
    stats.rating_1_count,
    stats.rating_2_count,
    stats.rating_3_count,
    stats.rating_4_count,
    stats.rating_5_count,
    TRUE as is_report_sent  -- 历史数据标记为已发送，避免重复推送
FROM (
    SELECT DISTINCT app_id 
    FROM app_feedback
) apps
CROSS JOIN (
    SELECT CURRENT_DATE - generate_series(0, 29) as date_val
) dates
CROSS JOIN LATERAL (
    SELECT * FROM generate_daily_rating_stats(apps.app_id, dates.date_val)
) stats
WHERE stats.total_ratings > 0  -- 只保存有数据的日期
  AND NOT EXISTS (
      SELECT 1 FROM app_rating_daily_stats 
      WHERE app_id = apps.app_id AND stat_date = dates.date_val
  );

-- 6. 计算趋势数据（环比变化）
UPDATE app_rating_daily_stats 
SET 
    rating_change_from_yesterday = current_stats.average_rating - COALESCE(prev_stats.average_rating, current_stats.average_rating),
    rating_count_change = current_stats.total_ratings - COALESCE(prev_stats.total_ratings, 0),
    review_count_change = current_stats.total_reviews - COALESCE(prev_stats.total_reviews, 0)
FROM app_rating_daily_stats current_stats
LEFT JOIN app_rating_daily_stats prev_stats ON (
    prev_stats.app_id = current_stats.app_id 
    AND prev_stats.stat_date = current_stats.stat_date - INTERVAL '1 day'
)
WHERE app_rating_daily_stats.id = current_stats.id;

-- 7. 创建迁移验证视图
CREATE OR REPLACE VIEW v_migration_validation AS
SELECT 
    'Total app_reviews' as metric,
    COUNT(*)::text as value
FROM app_reviews
UNION ALL
SELECT 
    'Total app_feedback' as metric,
    COUNT(*)::text as value
FROM app_feedback
UNION ALL
SELECT 
    'app_feedback reviews' as metric,
    COUNT(*)::text as value
FROM app_feedback WHERE type = 'review'
UNION ALL
SELECT 
    'app_feedback ratings' as metric,
    COUNT(*)::text as value
FROM app_feedback WHERE type = 'rating'
UNION ALL
SELECT 
    'Historical data marked' as metric,
    COUNT(*)::text as value
FROM app_feedback WHERE push_type = 'historical'
UNION ALL
SELECT 
    'Daily stats generated' as metric,
    COUNT(*)::text as value
FROM app_rating_daily_stats;

-- 查看迁移结果
-- SELECT * FROM v_migration_validation;
