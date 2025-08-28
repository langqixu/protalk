-- 升级app_reviews表结构支持统一的评分和评论管理
-- 在现有表基础上扩展字段，保持向后兼容

-- 注意：这个脚本将重构现有的app_reviews表
-- 执行前请确保已备份数据

-- 1. 创建新结构的app_reviews表
CREATE TABLE IF NOT EXISTS app_reviews_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id VARCHAR(255) UNIQUE NOT NULL,  -- App Store返回的ID
    app_id VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('review', 'rating')), -- 数据类型
    
    -- 通用字段（评分和评论都有）
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    user_nickname VARCHAR(255),
    feedback_date TIMESTAMP NOT NULL,
    country_code VARCHAR(10),
    
    -- 评论专用字段（仅type='review'时有值）
    title TEXT,                               -- 评论标题
    body TEXT,                                -- 评论内容
    is_edited BOOLEAN DEFAULT FALSE,
    developer_response TEXT,                  -- 开发者回复
    developer_response_date TIMESTAMP,
    
    -- 同步控制字段
    first_sync_at TIMESTAMP DEFAULT NOW(),    -- 首次同步时间
    is_pushed BOOLEAN DEFAULT FALSE,          -- 是否已推送
    push_type VARCHAR(20) CHECK (push_type IN ('new', 'historical', 'updated')),
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_app_reviews_new_app_id ON app_reviews_new(app_id);
CREATE INDEX IF NOT EXISTS idx_app_reviews_new_type ON app_reviews_new(type);
CREATE INDEX IF NOT EXISTS idx_app_reviews_new_feedback_date ON app_reviews_new(feedback_date);
CREATE INDEX IF NOT EXISTS idx_app_reviews_new_rating ON app_reviews_new(rating);
CREATE INDEX IF NOT EXISTS idx_app_reviews_new_is_pushed ON app_reviews_new(is_pushed);
CREATE INDEX IF NOT EXISTS idx_app_reviews_new_push_type ON app_reviews_new(push_type);
CREATE INDEX IF NOT EXISTS idx_app_reviews_new_first_sync ON app_reviews_new(first_sync_at);

-- 复合索引用于常见查询
CREATE INDEX IF NOT EXISTS idx_app_reviews_new_app_date ON app_reviews_new(app_id, feedback_date);
CREATE INDEX IF NOT EXISTS idx_app_reviews_new_app_type ON app_reviews_new(app_id, type);
CREATE INDEX IF NOT EXISTS idx_app_reviews_new_date_type ON app_reviews_new(feedback_date, type);

-- 3. 创建更新触发器
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

-- 4. 添加注释
COMMENT ON TABLE app_reviews_new IS '升级版app_reviews表，统一存储App Store评分和评论数据';
COMMENT ON COLUMN app_reviews_new.feedback_id IS 'App Store返回的唯一标识符（原review_id）';
COMMENT ON COLUMN app_reviews_new.type IS '数据类型：review(评论) 或 rating(纯评分)';
COMMENT ON COLUMN app_reviews_new.is_edited IS '是否被用户编辑过，用于检测内容变更';
COMMENT ON COLUMN app_reviews_new.is_pushed IS '是否已推送到飞书';
COMMENT ON COLUMN app_reviews_new.push_type IS '推送类型：new(新增)、historical(历史)、updated(更新)';
