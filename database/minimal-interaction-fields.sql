-- 最小化飞书卡片交互功能的数据库字段
-- 在 Supabase SQL Editor 中执行此脚本
-- 
-- 设计原则：
-- 1. 回复功能：只保存成功提交的回复，使用现有的 response_body + response_date
-- 2. 报告功能：纯前端交互，无需数据库存储
-- 3. 卡片状态：仅3个状态 initial -> replying -> replied

-- 1. 确保交互必需字段存在
DO $$
BEGIN
    -- 添加飞书消息ID字段（用于update_card API）
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

    -- 添加卡片状态字段（管理交互状态）
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

    -- 确保版本号和地区字段存在（用于卡片显示）
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
END $$;

-- 2. 设置精简的卡片状态约束（只需3个状态）
ALTER TABLE app_reviews 
DROP CONSTRAINT IF EXISTS chk_card_state_valid;

ALTER TABLE app_reviews 
ADD CONSTRAINT chk_card_state_valid 
CHECK (card_state IN ('initial', 'replying', 'replied'));

-- 3. 清理可能存在的冗余字段和表
DO $$
BEGIN
    -- 删除草稿相关字段（如果存在）
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'reply_draft' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE app_reviews DROP COLUMN reply_draft;
        RAISE NOTICE '已删除不需要的 reply_draft 列';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'report_draft' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE app_reviews DROP COLUMN report_draft;
        RAISE NOTICE '已删除不需要的 report_draft 列';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'last_interaction_at' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE app_reviews DROP COLUMN last_interaction_at;
        RAISE NOTICE '已删除不需要的 last_interaction_at 列';
    END IF;

    -- 删除问题报告表（如果存在）
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'review_issue_reports' 
        AND table_schema = 'public'
    ) THEN
        DROP TABLE review_issue_reports CASCADE;
        RAISE NOTICE '已删除不需要的 review_issue_reports 表';
    END IF;
END $$;

-- 4. 优化索引（只保留必要的）
CREATE INDEX IF NOT EXISTS idx_app_reviews_feishu_message_id ON app_reviews(feishu_message_id) 
WHERE feishu_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_app_reviews_card_state ON app_reviews(card_state) 
WHERE card_state != 'initial';

-- 5. 验证最终表结构
SELECT 
    'app_reviews' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'app_reviews' 
AND table_schema = 'public'
AND column_name IN (
    'response_body', 'response_date', 
    'feishu_message_id', 'card_state', 
    'app_version', 'territory_code'
)
ORDER BY ordinal_position;

-- 6. 验证约束
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name = 'chk_card_state_valid';

-- 7. 显示清理后的表数量
SELECT 
    COUNT(*) as total_tables,
    COUNT(CASE WHEN table_name = 'app_reviews' THEN 1 END) as app_reviews_exists,
    COUNT(CASE WHEN table_name = 'sync_log' THEN 1 END) as sync_log_exists,
    COUNT(CASE WHEN table_name = 'review_issue_reports' THEN 1 END) as issue_reports_exists
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('app_reviews', 'sync_log', 'review_issue_reports');

SELECT '精简版交互数据库结构完成!' as result;
