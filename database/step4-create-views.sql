-- 第四步：创建视图
-- 在 Supabase SQL Editor 中执行此脚本

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

-- 验证视图创建
SELECT 'Views created successfully!' as status;
