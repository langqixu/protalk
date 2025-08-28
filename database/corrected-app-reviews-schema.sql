-- 基于真实App Store Connect API数据结构的修正版app_reviews表设计
-- 参考: https://api.appstoreconnect.apple.com/v1/apps/{app_id}/customerReviews

-- ============================================================================
-- 数据结构分析
-- ============================================================================

/*
App Store Connect API 实际返回的数据结构：

1. customerReviews (主数据)
{
  "id": "unique-review-id",
  "type": "customerReviews",
  "attributes": {
    "rating": 5,                    // 1-5星评分
    "title": "Great app!",          // 评论标题（可选）
    "body": "Love this app...",     // 评论内容
    "reviewerNickname": "User123",  // 评论者昵称
    "createdDate": "2024-01-01T10:00:00.000Z", // 创建时间
    "isEdited": false               // 是否编辑过
  }
}

2. customerReviewResponses (关联数据，在included中)
{
  "id": "same-as-review-id",
  "type": "customerReviewResponses", 
  "attributes": {
    "body": "Thank you for...",     // 开发者回复内容
    "createdDate": "2024-01-02T10:00:00.000Z" // 回复时间
  }
}

重要发现：
- API只返回customerReviews，没有独立的ratings
- 每个review都包含rating字段
- 评分和评论是一体的，不是分离的数据类型
- 没有territory/country字段（可能在其他端点）
- 没有版本信息
*/

-- ============================================================================
-- 修正后的表结构设计
-- ============================================================================

-- 创建基于真实API结构的app_reviews表
CREATE TABLE app_reviews_corrected (
    -- 主键和唯一标识
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id VARCHAR(255) UNIQUE NOT NULL,      -- API返回的唯一ID
    app_id VARCHAR(255) NOT NULL,                -- 应用ID
    
    -- App Store Connect API 原始字段（确保100%对应）
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,                                  -- 评论标题（可选）
    body TEXT NOT NULL,                          -- 评论内容（必需）
    reviewer_nickname VARCHAR(255) NOT NULL,     -- 评论者昵称
    review_created_date TIMESTAMP NOT NULL,      -- 评论创建时间
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,    -- 是否编辑过
    
    -- 开发者回复（来自customerReviewResponses）
    developer_response_body TEXT,                -- 开发者回复内容
    developer_response_date TIMESTAMP,           -- 开发者回复时间
    
    -- 业务逻辑字段
    data_type VARCHAR(20) NOT NULL DEFAULT 'review' 
        CHECK (data_type IN ('review', 'rating_only')), -- 数据类型区分
    
    -- 同步控制字段
    first_sync_at TIMESTAMP DEFAULT NOW(),       -- 首次同步时间
    is_pushed BOOLEAN DEFAULT FALSE,             -- 是否已推送
    push_type VARCHAR(20) CHECK (push_type IN ('new', 'historical', 'updated')),
    
    -- 扩展字段（为未来可能的API扩展预留）
    territory_code VARCHAR(10),                  -- 国家/地区代码
    app_version VARCHAR(50),                     -- 应用版本
    review_state VARCHAR(20),                    -- 评论状态
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 索引设计（基于实际查询需求）
-- ============================================================================

-- 基础索引
CREATE INDEX idx_app_reviews_review_id ON app_reviews_corrected(review_id);
CREATE INDEX idx_app_reviews_app_id ON app_reviews_corrected(app_id);
CREATE INDEX idx_app_reviews_rating ON app_reviews_corrected(rating);
CREATE INDEX idx_app_reviews_created_date ON app_reviews_corrected(review_created_date);
CREATE INDEX idx_app_reviews_is_pushed ON app_reviews_corrected(is_pushed);

-- 复合索引（优化常见查询）
CREATE INDEX idx_app_reviews_app_date ON app_reviews_corrected(app_id, review_created_date);
CREATE INDEX idx_app_reviews_app_rating ON app_reviews_corrected(app_id, rating);
CREATE INDEX idx_app_reviews_date_rating ON app_reviews_corrected(review_created_date, rating);

-- 同步相关索引
CREATE INDEX idx_app_reviews_sync_status ON app_reviews_corrected(is_pushed, push_type);
CREATE INDEX idx_app_reviews_first_sync ON app_reviews_corrected(first_sync_at);

-- ============================================================================
-- 触发器和函数
-- ============================================================================

-- 自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_app_reviews_corrected_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_app_reviews_corrected_updated_at
    BEFORE UPDATE ON app_reviews_corrected
    FOR EACH ROW
    EXECUTE FUNCTION update_app_reviews_corrected_updated_at();

-- ============================================================================
-- 数据类型判断逻辑
-- ============================================================================

/*
基于API数据判断数据类型的逻辑：

1. review（完整评论）：
   - body 有内容且不为空
   - 通常也有title（但title可选）
   
2. rating_only（纯评分）：
   - body 为空或null
   - title 为空或null
   - 只有rating字段有值

实际上，根据API文档，App Store只返回customerReviews，
纯评分数据可能不会通过这个API端点返回。
*/

-- ============================================================================
-- 字段映射说明
-- ============================================================================

/*
API字段 -> 数据库字段映射：

customerReviews.attributes:
  id                    -> review_id
  rating                -> rating  
  title                 -> title
  body                  -> body
  reviewerNickname      -> reviewer_nickname
  createdDate           -> review_created_date
  isEdited              -> is_edited

customerReviewResponses.attributes:
  body                  -> developer_response_body
  createdDate           -> developer_response_date

业务字段：
  app_id                -> app_id (外部设置)
  data_type             -> 'review' (基于body是否有内容判断)
  first_sync_at         -> 首次同步时间
  is_pushed             -> 推送状态
  push_type             -> 推送类型
*/

-- ============================================================================
-- 表注释
-- ============================================================================

COMMENT ON TABLE app_reviews_corrected IS '基于App Store Connect API真实数据结构设计的评论表';
COMMENT ON COLUMN app_reviews_corrected.review_id IS 'App Store Connect API返回的唯一评论ID';
COMMENT ON COLUMN app_reviews_corrected.rating IS '1-5星评分（每个评论都包含）';
COMMENT ON COLUMN app_reviews_corrected.title IS '评论标题（可选，API可能返回null）';
COMMENT ON COLUMN app_reviews_corrected.body IS '评论内容（必需，纯评分时可能为空）';
COMMENT ON COLUMN app_reviews_corrected.reviewer_nickname IS '评论者昵称';
COMMENT ON COLUMN app_reviews_corrected.review_created_date IS '评论创建时间（API原始时间）';
COMMENT ON COLUMN app_reviews_corrected.is_edited IS '用户是否编辑过评论（Apple维护）';
COMMENT ON COLUMN app_reviews_corrected.data_type IS '数据类型：review(有内容) 或 rating_only(仅评分)';
COMMENT ON COLUMN app_reviews_corrected.territory_code IS '国家/地区代码（预留字段）';
COMMENT ON COLUMN app_reviews_corrected.app_version IS '应用版本（预留字段）';
