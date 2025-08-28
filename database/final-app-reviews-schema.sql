-- 最终版本：基于App Store Connect API真实结构的app_reviews表设计
-- 采用API原始命名，添加data_type二级定义字段

-- ============================================================================
-- 设计原则确认
-- ============================================================================
/*
1. ✅ 采用修正后的设计 - 完全基于App Store Connect API真实结构
2. ✅ 使用API原始命名 - 方便管理和追溯
3. ✅ 需要data_type字段 - 方便查询和筛选

API数据结构映射：
customerReviews.id                    -> review_id
customerReviews.attributes.rating     -> rating  
customerReviews.attributes.title      -> title
customerReviews.attributes.body       -> body
customerReviews.attributes.reviewerNickname -> reviewer_nickname
customerReviews.attributes.createdDate       -> created_date
customerReviews.attributes.isEdited          -> is_edited

customerReviewResponses.attributes.body      -> response_body
customerReviewResponses.attributes.createdDate -> response_date
*/

-- ============================================================================
-- 阶段1: 创建新结构的app_reviews表
-- ============================================================================

CREATE TABLE app_reviews_new (
    -- 主键和标识
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id VARCHAR(255) UNIQUE NOT NULL,      -- API原始ID
    app_id VARCHAR(255) NOT NULL,                -- 应用ID
    
    -- App Store Connect API 原始字段（保持命名一致性）
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,                                  -- 评论标题（API可选字段）
    body TEXT,                                   -- 评论内容（API必需，但可为空）
    reviewer_nickname VARCHAR(255) NOT NULL,     -- API原始字段名
    created_date TIMESTAMP NOT NULL,             -- API原始时间字段
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,    -- API原始编辑标记
    
    -- 开发者回复数据（来自customerReviewResponses）
    response_body TEXT,                          -- 开发者回复内容
    response_date TIMESTAMP,                     -- 开发者回复时间
    
    -- 二级定义字段（业务逻辑分类）
    data_type VARCHAR(20) NOT NULL DEFAULT 'review' 
        CHECK (data_type IN ('review', 'rating_only')),
    /*
    data_type 判断逻辑：
    - 'review': body不为空且有实际内容的完整评论
    - 'rating_only': body为空或仅包含空白字符的纯评分
    */
    
    -- 同步控制字段
    first_sync_at TIMESTAMP DEFAULT NOW(),       -- 首次同步到系统的时间
    is_pushed BOOLEAN DEFAULT FALSE,             -- 是否已推送到飞书
    push_type VARCHAR(20) CHECK (push_type IN ('new', 'historical', 'updated')),
    
    -- 扩展字段（为未来API扩展预留）
    territory_code VARCHAR(10),                  -- 国家/地区代码
    app_version VARCHAR(50),                     -- 应用版本信息
    review_state VARCHAR(20),                    -- 评论状态
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT NOW(),          -- 记录创建时间
    updated_at TIMESTAMP DEFAULT NOW()           -- 记录更新时间
);

-- ============================================================================
-- 阶段2: 创建优化索引
-- ============================================================================

-- 主要索引（基于API字段）
CREATE INDEX idx_app_reviews_new_review_id ON app_reviews_new(review_id);
CREATE INDEX idx_app_reviews_new_app_id ON app_reviews_new(app_id);
CREATE INDEX idx_app_reviews_new_rating ON app_reviews_new(rating);
CREATE INDEX idx_app_reviews_new_created_date ON app_reviews_new(created_date);
CREATE INDEX idx_app_reviews_new_is_edited ON app_reviews_new(is_edited);

-- 业务逻辑索引
CREATE INDEX idx_app_reviews_new_data_type ON app_reviews_new(data_type);
CREATE INDEX idx_app_reviews_new_is_pushed ON app_reviews_new(is_pushed);
CREATE INDEX idx_app_reviews_new_push_type ON app_reviews_new(push_type);

-- 复合索引（优化常见查询）
CREATE INDEX idx_app_reviews_new_app_date ON app_reviews_new(app_id, created_date);
CREATE INDEX idx_app_reviews_new_app_rating ON app_reviews_new(app_id, rating);
CREATE INDEX idx_app_reviews_new_app_type ON app_reviews_new(app_id, data_type);
CREATE INDEX idx_app_reviews_new_date_type ON app_reviews_new(created_date, data_type);
CREATE INDEX idx_app_reviews_new_rating_type ON app_reviews_new(rating, data_type);

-- 同步相关复合索引
CREATE INDEX idx_app_reviews_new_sync_status ON app_reviews_new(is_pushed, push_type);
CREATE INDEX idx_app_reviews_new_first_sync ON app_reviews_new(first_sync_at);
CREATE INDEX idx_app_reviews_new_app_sync ON app_reviews_new(app_id, first_sync_at);

-- ============================================================================
-- 阶段3: 创建触发器和函数
-- ============================================================================

-- 自动更新updated_at触发器
CREATE OR REPLACE FUNCTION update_app_reviews_new_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_app_reviews_new_updated_at
    BEFORE UPDATE ON app_reviews_new
    FOR EACH ROW
    EXECUTE FUNCTION update_app_reviews_new_updated_at();

-- 自动设置data_type的触发器
CREATE OR REPLACE FUNCTION set_app_reviews_new_data_type()
RETURNS TRIGGER AS $$
BEGIN
    -- 基于body内容自动判断data_type
    IF NEW.body IS NOT NULL AND TRIM(NEW.body) != '' THEN
        NEW.data_type = 'review';
    ELSE
        NEW.data_type = 'rating_only';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_app_reviews_new_data_type
    BEFORE INSERT OR UPDATE ON app_reviews_new
    FOR EACH ROW
    EXECUTE FUNCTION set_app_reviews_new_data_type();

-- ============================================================================
-- 阶段4: 数据迁移脚本
-- ============================================================================

-- 从现有app_reviews表迁移数据
INSERT INTO app_reviews_new (
    review_id,
    app_id,
    rating,
    title,
    body,
    reviewer_nickname,
    created_date,
    is_edited,
    response_body,
    response_date,
    data_type,
    first_sync_at,
    is_pushed,
    push_type,
    created_at,
    updated_at
)
SELECT 
    -- API原始字段映射
    review_id,                               -- 保持不变
    app_id,                                  -- 保持不变
    rating,                                  -- 保持不变
    title,                                   -- 保持不变
    body,                                    -- 保持不变
    nickname as reviewer_nickname,           -- 字段重命名
    review_date as created_date,             -- 字段重命名
    is_edited,                               -- 保持不变
    response_body,                           -- 保持不变
    response_date,                           -- 保持不变
    
    -- 自动判断data_type
    CASE 
        WHEN body IS NOT NULL AND TRIM(body) != '' THEN 'review'
        ELSE 'rating_only'
    END as data_type,
    
    -- 同步控制字段
    created_at as first_sync_at,             -- 假设创建时间为首次同步时间
    TRUE as is_pushed,                       -- 现有数据标记为已推送
    'historical' as push_type,               -- 现有数据标记为历史数据
    
    -- 审计字段
    created_at,
    updated_at
FROM app_reviews
WHERE NOT EXISTS (
    SELECT 1 FROM app_reviews_new 
    WHERE app_reviews_new.review_id = app_reviews.review_id
);

-- ============================================================================
-- 阶段5: 数据验证
-- ============================================================================

-- 创建验证函数
CREATE OR REPLACE FUNCTION validate_migration_data()
RETURNS TABLE (
    validation_item TEXT,
    original_count BIGINT,
    new_count BIGINT,
    status TEXT
) AS $$
BEGIN
    -- 总数验证
    RETURN QUERY
    SELECT 
        'Total Records'::TEXT,
        (SELECT COUNT(*) FROM app_reviews)::BIGINT,
        (SELECT COUNT(*) FROM app_reviews_new)::BIGINT,
        CASE 
            WHEN (SELECT COUNT(*) FROM app_reviews) = (SELECT COUNT(*) FROM app_reviews_new)
            THEN '✅ PASS'::TEXT
            ELSE '❌ FAIL'::TEXT
        END;
    
    -- data_type分布验证
    RETURN QUERY
    SELECT 
        'Review Type Count'::TEXT,
        (SELECT COUNT(*) FROM app_reviews WHERE body IS NOT NULL AND TRIM(body) != '')::BIGINT,
        (SELECT COUNT(*) FROM app_reviews_new WHERE data_type = 'review')::BIGINT,
        CASE 
            WHEN (SELECT COUNT(*) FROM app_reviews WHERE body IS NOT NULL AND TRIM(body) != '') = 
                 (SELECT COUNT(*) FROM app_reviews_new WHERE data_type = 'review')
            THEN '✅ PASS'::TEXT
            ELSE '❌ FAIL'::TEXT
        END;
    
    RETURN QUERY
    SELECT 
        'Rating Only Count'::TEXT,
        (SELECT COUNT(*) FROM app_reviews WHERE body IS NULL OR TRIM(body) = '')::BIGINT,
        (SELECT COUNT(*) FROM app_reviews_new WHERE data_type = 'rating_only')::BIGINT,
        CASE 
            WHEN (SELECT COUNT(*) FROM app_reviews WHERE body IS NULL OR TRIM(body) = '') = 
                 (SELECT COUNT(*) FROM app_reviews_new WHERE data_type = 'rating_only')
            THEN '✅ PASS'::TEXT
            ELSE '❌ FAIL'::TEXT
        END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 阶段6: 创建便捷视图
-- ============================================================================

-- 创建查询便捷视图
CREATE VIEW v_app_reviews_summary AS
SELECT 
    app_id,
    data_type,
    COUNT(*) as total_count,
    AVG(rating) as average_rating,
    COUNT(CASE WHEN response_body IS NOT NULL THEN 1 END) as replied_count,
    MAX(created_date) as latest_review_date,
    MIN(created_date) as earliest_review_date
FROM app_reviews_new
GROUP BY app_id, data_type;

-- 创建推送状态视图
CREATE VIEW v_app_reviews_push_status AS
SELECT 
    app_id,
    data_type,
    push_type,
    is_pushed,
    COUNT(*) as count
FROM app_reviews_new
GROUP BY app_id, data_type, push_type, is_pushed;

-- ============================================================================
-- 阶段7: 表注释和文档
-- ============================================================================

-- 表注释
COMMENT ON TABLE app_reviews_new IS '基于App Store Connect API真实结构设计的评论表，使用API原始字段命名';

-- 字段注释
COMMENT ON COLUMN app_reviews_new.review_id IS 'App Store Connect API返回的唯一评论ID (customerReviews.id)';
COMMENT ON COLUMN app_reviews_new.rating IS '1-5星评分 (customerReviews.attributes.rating)';
COMMENT ON COLUMN app_reviews_new.title IS '评论标题 (customerReviews.attributes.title)';
COMMENT ON COLUMN app_reviews_new.body IS '评论内容 (customerReviews.attributes.body)';
COMMENT ON COLUMN app_reviews_new.reviewer_nickname IS '评论者昵称 (customerReviews.attributes.reviewerNickname)';
COMMENT ON COLUMN app_reviews_new.created_date IS '评论创建时间 (customerReviews.attributes.createdDate)';
COMMENT ON COLUMN app_reviews_new.is_edited IS '是否编辑过 (customerReviews.attributes.isEdited)';
COMMENT ON COLUMN app_reviews_new.response_body IS '开发者回复内容 (customerReviewResponses.attributes.body)';
COMMENT ON COLUMN app_reviews_new.response_date IS '开发者回复时间 (customerReviewResponses.attributes.createdDate)';
COMMENT ON COLUMN app_reviews_new.data_type IS '二级定义：review(完整评论) 或 rating_only(纯评分)';
COMMENT ON COLUMN app_reviews_new.first_sync_at IS '首次同步到系统的时间';
COMMENT ON COLUMN app_reviews_new.is_pushed IS '是否已推送到飞书';
COMMENT ON COLUMN app_reviews_new.push_type IS '推送类型：new(新增)、historical(历史)、updated(更新)';

-- 视图注释
COMMENT ON VIEW v_app_reviews_summary IS '应用评论汇总统计视图';
COMMENT ON VIEW v_app_reviews_push_status IS '应用评论推送状态统计视图';

-- ============================================================================
-- 执行验证和总结
-- ============================================================================

-- 执行验证
-- SELECT * FROM validate_migration_data();

-- 查看数据分布
-- SELECT * FROM v_app_reviews_summary ORDER BY app_id, data_type;

-- 查看推送状态
-- SELECT * FROM v_app_reviews_push_status ORDER BY app_id, data_type;

RAISE NOTICE '✅ 基于API原始结构的app_reviews表创建完成！';
RAISE NOTICE '📊 请执行 SELECT * FROM validate_migration_data(); 验证数据迁移';
RAISE NOTICE '📈 请执行 SELECT * FROM v_app_reviews_summary; 查看数据分布';
