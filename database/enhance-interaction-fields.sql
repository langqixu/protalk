-- 增强飞书卡片交互功能的数据库字段
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 添加草稿暂存字段
DO $$
BEGIN
    -- 添加回复草稿字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'reply_draft' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE app_reviews ADD COLUMN reply_draft TEXT;
        RAISE NOTICE '已添加 reply_draft 列';
    ELSE
        RAISE NOTICE 'reply_draft 列已存在';
    END IF;

    -- 添加报告草稿字段（JSONB格式存储类型+描述）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'report_draft' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE app_reviews ADD COLUMN report_draft JSONB;
        RAISE NOTICE '已添加 report_draft 列';
    ELSE
        RAISE NOTICE 'report_draft 列已存在';
    END IF;

    -- 添加最后交互时间字段（用于清理超时的草稿）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'last_interaction_at' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE app_reviews ADD COLUMN last_interaction_at TIMESTAMPTZ;
        RAISE NOTICE '已添加 last_interaction_at 列';
    ELSE
        RAISE NOTICE 'last_interaction_at 列已存在';
    END IF;
END $$;

-- 2. 扩展卡片状态约束
ALTER TABLE app_reviews 
DROP CONSTRAINT IF EXISTS chk_card_state_valid;

ALTER TABLE app_reviews 
ADD CONSTRAINT chk_card_state_valid 
CHECK (card_state IN ('initial', 'replying', 'replied', 'reporting', 'reported', 'editing_reply'));

-- 3. 更新问题报告表的约束（更本土化的选项）
ALTER TABLE review_issue_reports 
DROP CONSTRAINT IF EXISTS chk_issue_type_valid;

ALTER TABLE review_issue_reports 
ADD CONSTRAINT chk_issue_type_valid 
CHECK (issue_type IN ('inappropriate_content', 'spam_or_fraud', 'off_topic', 'technical_issue', 'other'));

-- 4. 添加索引优化
CREATE INDEX IF NOT EXISTS idx_app_reviews_reply_draft ON app_reviews(reply_draft) WHERE reply_draft IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_reviews_last_interaction ON app_reviews(last_interaction_at);
CREATE INDEX IF NOT EXISTS idx_app_reviews_card_feishu ON app_reviews(card_state, feishu_message_id);

-- 5. 创建清理超时草稿的函数
CREATE OR REPLACE FUNCTION cleanup_expired_drafts()
RETURNS integer AS $$
DECLARE
    cleaned_count integer;
BEGIN
    -- 清理超过2小时未操作的草稿状态
    UPDATE app_reviews 
    SET 
        card_state = 'initial',
        reply_draft = NULL,
        report_draft = NULL
    WHERE 
        card_state IN ('replying', 'reporting', 'editing_reply')
        AND last_interaction_at < NOW() - INTERVAL '2 hours';
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    RAISE NOTICE '已清理 % 条超时草稿', cleaned_count;
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- 6. 验证字段更新
SELECT 
    'app_reviews' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'app_reviews' 
AND table_schema = 'public'
AND column_name IN ('reply_draft', 'report_draft', 'last_interaction_at', 'card_state')
ORDER BY ordinal_position;

-- 7. 验证约束更新
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%card_state%' OR constraint_name LIKE '%issue_type%';

-- 8. 添加清理任务（可选，建议定期运行）
-- 这个可以通过 cron 或应用层定时任务调用
-- SELECT cleanup_expired_drafts();

SELECT '数据库交互字段增强完成!' as result;
