-- 添加飞书消息ID字段
-- 在 Supabase SQL Editor 中执行此脚本
-- 这是实现飞书卡片交互功能的唯一必需字段

-- 添加 feishu_message_id 字段
ALTER TABLE app_reviews 
ADD COLUMN IF NOT EXISTS feishu_message_id TEXT;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_app_reviews_feishu_message_id 
ON app_reviews(feishu_message_id) 
WHERE feishu_message_id IS NOT NULL;

-- 验证字段添加
SELECT 
    'feishu_message_id' as field_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' 
        AND column_name = 'feishu_message_id' 
        AND table_schema = 'public'
    ) as exists;

SELECT 'feishu_message_id 字段添加完成!' as result;
