-- 超精简飞书卡片交互功能的数据库字段
-- 在 Supabase SQL Editor 中执行此脚本
-- 
-- 设计原则：
-- 1. 回复状态：基于现有的 response_body 字段动态判断，无需额外存储状态
-- 2. 报告功能：纯前端交互，无需数据库存储
-- 3. 卡片更新：只需要 feishu_message_id 用于调用 update_card API

-- 1. 确保飞书消息ID字段存在（唯一必需的新字段）
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

-- 2. 清理所有不必要的字段和表
DO $$
BEGIN
    -- 删除卡片状态字段（不需要！基于 response_body 动态判断）
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'card_state' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE app_reviews DROP COLUMN card_state CASCADE;
        RAISE NOTICE '已删除不需要的 card_state 列';
    END IF;

    -- 删除草稿相关字段
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

    -- 删除问题报告表
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'review_issue_reports' 
        AND table_schema = 'public'
    ) THEN
        DROP TABLE review_issue_reports CASCADE;
        RAISE NOTICE '已删除不需要的 review_issue_reports 表';
    END IF;

    -- 删除相关的约束
    ALTER TABLE app_reviews DROP CONSTRAINT IF EXISTS chk_card_state_valid;
    RAISE NOTICE '已删除不需要的状态约束';
END $$;

-- 3. 优化索引（只保留真正必要的）
CREATE INDEX IF NOT EXISTS idx_app_reviews_feishu_message_id ON app_reviews(feishu_message_id) 
WHERE feishu_message_id IS NOT NULL;

-- 基于 response_body 的索引，用于快速判断回复状态
CREATE INDEX IF NOT EXISTS idx_app_reviews_has_response ON app_reviews(review_id) 
WHERE response_body IS NOT NULL;

-- 4. 验证最终表结构
SELECT 
    'app_reviews 表最终字段' as description,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'app_reviews' 
AND table_schema = 'public'
AND column_name IN (
    'review_id', 'response_body', 'response_date', 
    'feishu_message_id', 'app_version', 'territory_code'
)
ORDER BY ordinal_position;

-- 5. 显示表的数量和状态
SELECT 
    COUNT(*) as total_tables,
    COUNT(CASE WHEN table_name = 'app_reviews' THEN 1 END) as app_reviews_exists,
    COUNT(CASE WHEN table_name = 'sync_log' THEN 1 END) as sync_log_exists
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('app_reviews', 'sync_log');

-- 6. 显示卡片状态判断逻辑示例
SELECT 
    '卡片状态判断逻辑示例' as description;

-- 这个查询展示了如何基于 response_body 动态判断卡片状态
SELECT 
    review_id,
    CASE 
        WHEN response_body IS NOT NULL AND response_body != '' THEN 'replied'
        ELSE 'initial'
    END as dynamic_card_state,
    response_body IS NOT NULL as has_reply,
    feishu_message_id IS NOT NULL as can_update_card
FROM app_reviews 
LIMIT 5;

SELECT '超精简交互数据库结构完成!' as result,
       '卡片状态基于 response_body 动态判断，无需存储额外状态字段！' as advantage;
