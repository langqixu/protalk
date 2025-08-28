-- 创建评论映射表
-- 用于存储飞书消息ID和评论ID的映射关系

CREATE TABLE IF NOT EXISTS comment_mappings (
    id SERIAL PRIMARY KEY,
    message_id TEXT NOT NULL UNIQUE,
    review_id TEXT NOT NULL,
    app_id TEXT NOT NULL,
    store_type TEXT NOT NULL DEFAULT 'appstore',
    thread_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_comment_mappings_message_id ON comment_mappings(message_id);
CREATE INDEX IF NOT EXISTS idx_comment_mappings_review_id ON comment_mappings(review_id);
CREATE INDEX IF NOT EXISTS idx_comment_mappings_app_id ON comment_mappings(app_id);
CREATE INDEX IF NOT EXISTS idx_comment_mappings_thread_id ON comment_mappings(thread_id);

-- 创建复合索引
CREATE INDEX IF NOT EXISTS idx_comment_mappings_app_review ON comment_mappings(app_id, review_id);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_comment_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comment_mappings_updated_at_trigger
    BEFORE UPDATE ON comment_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_mappings_updated_at();

-- 启用 RLS
ALTER TABLE comment_mappings ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "Allow all operations on comment_mappings" ON comment_mappings
    FOR ALL USING (true);

-- 验证表创建
SELECT 'Comment mappings table created successfully!' as status;
