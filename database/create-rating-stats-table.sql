-- 创建评分统计表
-- 存储每日聚合的评分统计数据

-- 1. 创建评分统计表
CREATE TABLE IF NOT EXISTS app_rating_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id VARCHAR(255) NOT NULL,
    stat_date DATE NOT NULL,
    
    -- 评分分布（从app_feedback聚合）
    rating_1_count INTEGER DEFAULT 0,
    rating_2_count INTEGER DEFAULT 0,
    rating_3_count INTEGER DEFAULT 0,
    rating_4_count INTEGER DEFAULT 0,
    rating_5_count INTEGER DEFAULT 0,
    
    -- 统计指标
    total_ratings INTEGER NOT NULL,           -- 当日总评分数
    total_reviews INTEGER NOT NULL,           -- 当日评论数（type='review'）
    average_rating DECIMAL(3,2) NOT NULL,     -- 当日平均分
    
    -- 趋势分析（与前一日对比）
    rating_change_from_yesterday DECIMAL(3,2), -- 平均分环比变化
    rating_count_change INTEGER,               -- 评分数量变化
    review_count_change INTEGER,               -- 评论数量变化
    
    -- 推送状态
    is_report_sent BOOLEAN DEFAULT FALSE,     -- 是否已发送日报
    report_sent_at TIMESTAMP,                 -- 日报发送时间
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 唯一约束
    UNIQUE(app_id, stat_date)
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_rating_stats_app_id ON app_rating_daily_stats(app_id);
CREATE INDEX IF NOT EXISTS idx_rating_stats_date ON app_rating_daily_stats(stat_date);
CREATE INDEX IF NOT EXISTS idx_rating_stats_app_date ON app_rating_daily_stats(app_id, stat_date);
CREATE INDEX IF NOT EXISTS idx_rating_stats_report_sent ON app_rating_daily_stats(is_report_sent);

-- 3. 创建更新触发器
CREATE OR REPLACE FUNCTION update_rating_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_rating_stats_updated_at
    BEFORE UPDATE ON app_rating_daily_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_rating_stats_updated_at();

-- 4. 创建视图：最近7天评分趋势
CREATE OR REPLACE VIEW v_recent_rating_trends AS
SELECT 
    app_id,
    stat_date,
    average_rating,
    total_ratings,
    total_reviews,
    rating_change_from_yesterday,
    rating_count_change,
    review_count_change,
    -- 7天平均分
    AVG(average_rating) OVER (
        PARTITION BY app_id 
        ORDER BY stat_date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as avg_7_days,
    -- 7天评分数平均
    AVG(total_ratings) OVER (
        PARTITION BY app_id 
        ORDER BY stat_date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as avg_ratings_7_days
FROM app_rating_daily_stats
WHERE stat_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY app_id, stat_date DESC;

-- 5. 创建函数：生成每日统计数据
CREATE OR REPLACE FUNCTION generate_daily_rating_stats(
    target_app_id VARCHAR(255),
    target_date DATE
) RETURNS TABLE (
    total_ratings INTEGER,
    total_reviews INTEGER,
    average_rating DECIMAL(3,2),
    rating_1_count INTEGER,
    rating_2_count INTEGER,
    rating_3_count INTEGER,
    rating_4_count INTEGER,
    rating_5_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_ratings,
        COUNT(CASE WHEN type = 'review' THEN 1 END)::INTEGER as total_reviews,
        ROUND(AVG(rating), 2)::DECIMAL(3,2) as average_rating,
        COUNT(CASE WHEN rating = 1 THEN 1 END)::INTEGER as rating_1_count,
        COUNT(CASE WHEN rating = 2 THEN 1 END)::INTEGER as rating_2_count,
        COUNT(CASE WHEN rating = 3 THEN 1 END)::INTEGER as rating_3_count,
        COUNT(CASE WHEN rating = 4 THEN 1 END)::INTEGER as rating_4_count,
        COUNT(CASE WHEN rating = 5 THEN 1 END)::INTEGER as rating_5_count
    FROM app_feedback 
    WHERE app_id = target_app_id 
      AND DATE(feedback_date) = target_date;
END;
$$ LANGUAGE plpgsql;

-- 6. 添加注释
COMMENT ON TABLE app_rating_daily_stats IS '每日App评分统计数据';
COMMENT ON COLUMN app_rating_daily_stats.stat_date IS '统计日期';
COMMENT ON COLUMN app_rating_daily_stats.rating_change_from_yesterday IS '平均分相比昨日的变化';
COMMENT ON COLUMN app_rating_daily_stats.is_report_sent IS '是否已发送日报到飞书';
COMMENT ON VIEW v_recent_rating_trends IS '最近30天评分趋势视图，包含7天移动平均';
COMMENT ON FUNCTION generate_daily_rating_stats IS '生成指定日期的评分统计数据';
