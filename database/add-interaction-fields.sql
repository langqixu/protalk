-- 为飞书卡片交互功能添加新字段
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 添加版本号和地区信息字段
DO $$
BEGIN
    -- 添加应用版本字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'app_version' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE app_reviews ADD COLUMN app_version TEXT;
        RAISE NOTICE '已添加 app_version 列';
    ELSE
        RAISE NOTICE 'app_version 列已存在';
    END IF;

    -- 添加地区代码字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'territory_code' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE app_reviews ADD COLUMN territory_code TEXT;
        RAISE NOTICE '已添加 territory_code 列';
    ELSE
        RAISE NOTICE 'territory_code 列已存在';
    END IF;

    -- 添加卡片消息ID字段（用于update_card）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'feishu_message_id' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE app_reviews ADD COLUMN feishu_message_id TEXT;
        RAISE NOTICE '已添加 feishu_message_id 列';
    ELSE
        RAISE NOTICE 'feishu_message_id 列已存在';
    END IF;

    -- 添加卡片状态字段（用于管理交互状态）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'card_state' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE app_reviews ADD COLUMN card_state TEXT DEFAULT 'initial';
        RAISE NOTICE '已添加 card_state 列';
    ELSE
        RAISE NOTICE 'card_state 列已存在';
    END IF;
END $$;

-- 2. 创建问题报告表
CREATE TABLE IF NOT EXISTS review_issue_reports (
    id SERIAL PRIMARY KEY,
    review_id TEXT NOT NULL REFERENCES app_reviews(review_id),
    issue_type TEXT NOT NULL, -- 'harmful_content', 'spam', 'off_topic', 'other'
    description TEXT,
    reporter_open_id TEXT, -- 飞书用户的open_id
    report_time TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_app_reviews_feishu_message_id ON app_reviews(feishu_message_id);
CREATE INDEX IF NOT EXISTS idx_app_reviews_card_state ON app_reviews(card_state);
CREATE INDEX IF NOT EXISTS idx_review_issue_reports_review_id ON review_issue_reports(review_id);
CREATE INDEX IF NOT EXISTS idx_review_issue_reports_status ON review_issue_reports(status);

-- 4. 为新表添加更新时间触发器
DROP TRIGGER IF EXISTS update_review_issue_reports_updated_at ON review_issue_reports;
CREATE TRIGGER update_review_issue_reports_updated_at 
    BEFORE UPDATE ON review_issue_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. 验证新字段和表
SELECT 
    'app_reviews' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'app_reviews' 
AND table_schema = 'public'
AND column_name IN ('app_version', 'territory_code', 'feishu_message_id', 'card_state')
ORDER BY ordinal_position;

SELECT 
    'review_issue_reports' as table_name,
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'review_issue_reports' AND table_schema = 'public') 
        THEN '创建成功' 
        ELSE '创建失败' 
    END as status;

-- 6. 设置 Card State 的约束
ALTER TABLE app_reviews 
DROP CONSTRAINT IF EXISTS chk_card_state_valid;

ALTER TABLE app_reviews 
ADD CONSTRAINT chk_card_state_valid 
CHECK (card_state IN ('initial', 'replying', 'replied', 'editing_reply'));

-- 7. 设置 Issue Type 的约束
ALTER TABLE review_issue_reports 
DROP CONSTRAINT IF EXISTS chk_issue_type_valid;

ALTER TABLE review_issue_reports 
ADD CONSTRAINT chk_issue_type_valid 
CHECK (issue_type IN ('harmful_content', 'spam', 'off_topic', 'other'));

SELECT '数据库字段扩展完成!' as result;
