-- 批量更新历史数据的 isPushed 状态
-- 目的：一次性将所有历史评论标记为已推送，避免重复推送

-- 1. 查看当前未推送的评论数量（执行前检查）
SELECT 
    COUNT(*) as total_reviews,
    COUNT(CASE WHEN is_pushed = false OR is_pushed IS NULL THEN 1 END) as unpushed_reviews,
    COUNT(CASE WHEN is_pushed = true THEN 1 END) as already_pushed_reviews
FROM app_reviews;

-- 2. 查看按创建时间分布的未推送评论（了解历史数据分布）
SELECT 
    DATE_TRUNC('month', created_date) as month,
    COUNT(*) as review_count,
    COUNT(CASE WHEN is_pushed = false OR is_pushed IS NULL THEN 1 END) as unpushed_count
FROM app_reviews 
GROUP BY DATE_TRUNC('month', created_date)
ORDER BY month DESC
LIMIT 12;

-- 3. 设置历史数据的阈值（24小时前的数据被认为是历史数据）
-- 批量更新历史数据为已推送状态
UPDATE app_reviews 
SET 
    is_pushed = true,
    push_type = 'historical',
    updated_at = NOW()
WHERE 
    -- 条件1：当前未推送或推送状态为空
    (is_pushed = false OR is_pushed IS NULL)
    -- 条件2：创建时间在24小时前（历史数据）
    AND created_date < NOW() - INTERVAL '24 hours'
    -- 条件3：first_sync_at也在24小时前（确保是真正的历史数据）
    AND (first_sync_at IS NULL OR first_sync_at < NOW() - INTERVAL '24 hours');

-- 4. 验证更新结果
SELECT 
    '更新后统计' as status,
    COUNT(*) as total_reviews,
    COUNT(CASE WHEN is_pushed = false OR is_pushed IS NULL THEN 1 END) as unpushed_reviews,
    COUNT(CASE WHEN is_pushed = true THEN 1 END) as pushed_reviews,
    COUNT(CASE WHEN push_type = 'historical' THEN 1 END) as historical_reviews
FROM app_reviews;

-- 5. 查看最近更新的历史数据样本
SELECT 
    review_id,
    created_date,
    first_sync_at,
    is_pushed,
    push_type,
    updated_at
FROM app_reviews 
WHERE push_type = 'historical' 
ORDER BY updated_at DESC 
LIMIT 10;

-- 可选：如果需要回滚操作（谨慎使用）
-- UPDATE app_reviews 
-- SET 
--     is_pushed = false,
--     push_type = NULL,
--     updated_at = NOW()
-- WHERE push_type = 'historical';
