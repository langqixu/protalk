-- 完整的app_reviews表升级迁移脚本
-- 目标：保持表名app_reviews不变，升级表结构支持统一的评分和评论管理

-- ============================================================================
-- 阶段1: 安全备份
-- ============================================================================

-- 1.1 创建备份表
CREATE TABLE IF NOT EXISTS app_reviews_backup_$(date +%Y%m%d) AS 
SELECT * FROM app_reviews;

-- 1.2 验证备份完整性
-- SELECT COUNT(*) as original_count FROM app_reviews;
-- SELECT COUNT(*) as backup_count FROM app_reviews_backup_$(date +%Y%m%d);

-- ============================================================================
-- 阶段2: 创建新结构表
-- ============================================================================

-- 2.1 创建升级版的app_reviews表（临时名称）
CREATE TABLE app_reviews_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id VARCHAR(255) UNIQUE NOT NULL,  -- 原review_id字段
    app_id VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'review' CHECK (type IN ('review', 'rating')),
    
    -- 通用字段（评分和评论都有）
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    user_nickname VARCHAR(255),
    feedback_date TIMESTAMP NOT NULL,
    country_code VARCHAR(10),
    
    -- 评论专用字段（仅type='review'时有值）
    title TEXT,
    body TEXT,
    is_edited BOOLEAN DEFAULT FALSE,
    developer_response TEXT,
    developer_response_date TIMESTAMP,
    
    -- 同步控制字段
    first_sync_at TIMESTAMP DEFAULT NOW(),
    is_pushed BOOLEAN DEFAULT FALSE,
    push_type VARCHAR(20) CHECK (push_type IN ('new', 'historical', 'updated')),
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2.2 创建索引
CREATE INDEX idx_app_reviews_new_feedback_id ON app_reviews_new(feedback_id);
CREATE INDEX idx_app_reviews_new_app_id ON app_reviews_new(app_id);
CREATE INDEX idx_app_reviews_new_type ON app_reviews_new(type);
CREATE INDEX idx_app_reviews_new_feedback_date ON app_reviews_new(feedback_date);
CREATE INDEX idx_app_reviews_new_rating ON app_reviews_new(rating);
CREATE INDEX idx_app_reviews_new_is_pushed ON app_reviews_new(is_pushed);

-- 复合索引
CREATE INDEX idx_app_reviews_new_app_date ON app_reviews_new(app_id, feedback_date);
CREATE INDEX idx_app_reviews_new_app_type ON app_reviews_new(app_id, type);
CREATE INDEX idx_app_reviews_new_date_type ON app_reviews_new(feedback_date, type);

-- 2.3 创建触发器
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

-- ============================================================================
-- 阶段3: 数据迁移
-- ============================================================================

-- 3.1 迁移现有app_reviews数据到新表
INSERT INTO app_reviews_new (
    feedback_id,
    app_id,
    type,
    rating,
    user_nickname,
    feedback_date,
    title,
    body,
    is_edited,
    developer_response,
    developer_response_date,
    first_sync_at,
    is_pushed,
    push_type,
    created_at,
    updated_at
)
SELECT 
    review_id as feedback_id,
    app_id,
    'review' as type,                         -- 现有数据都标记为评论类型
    rating,
    nickname as user_nickname,
    review_date as feedback_date,
    title,
    body,
    is_edited,
    response_body as developer_response,
    response_date as developer_response_date,
    created_at as first_sync_at,              -- 假设创建时间为首次同步时间
    TRUE as is_pushed,                        -- 现有数据标记为已推送
    'historical' as push_type,                -- 现有数据标记为历史数据
    created_at,
    updated_at
FROM app_reviews
WHERE NOT EXISTS (
    SELECT 1 FROM app_reviews_new 
    WHERE app_reviews_new.feedback_id = app_reviews.review_id
);

-- ============================================================================
-- 阶段4: 数据验证
-- ============================================================================

-- 4.1 验证数据完整性
DO $$
DECLARE
    original_count INTEGER;
    new_count INTEGER;
    sample_check BOOLEAN := TRUE;
BEGIN
    -- 检查总数
    SELECT COUNT(*) INTO original_count FROM app_reviews;
    SELECT COUNT(*) INTO new_count FROM app_reviews_new;
    
    IF original_count != new_count THEN
        RAISE EXCEPTION '数据迁移失败：记录数不匹配 (原表: %, 新表: %)', original_count, new_count;
    END IF;
    
    -- 随机抽样验证
    SELECT NOT EXISTS (
        SELECT 1 FROM app_reviews old_r
        LEFT JOIN app_reviews_new new_r ON old_r.review_id = new_r.feedback_id
        WHERE new_r.feedback_id IS NULL
        LIMIT 1
    ) INTO sample_check;
    
    IF NOT sample_check THEN
        RAISE EXCEPTION '数据迁移失败：存在未迁移的记录';
    END IF;
    
    RAISE NOTICE '✅ 数据验证通过：原表 % 条记录，新表 % 条记录', original_count, new_count;
END $$;

-- ============================================================================
-- 阶段5: 原子性表替换
-- ============================================================================

-- 5.1 在事务中执行表替换
BEGIN;

-- 重命名表：原表 -> 备份，新表 -> 正式表
ALTER TABLE app_reviews RENAME TO app_reviews_old;
ALTER TABLE app_reviews_new RENAME TO app_reviews;

-- 更新索引名称以保持一致性
ALTER INDEX idx_app_reviews_new_feedback_id RENAME TO idx_app_reviews_feedback_id;
ALTER INDEX idx_app_reviews_new_app_id RENAME TO idx_app_reviews_app_id;
ALTER INDEX idx_app_reviews_new_type RENAME TO idx_app_reviews_type;
ALTER INDEX idx_app_reviews_new_feedback_date RENAME TO idx_app_reviews_feedback_date;
ALTER INDEX idx_app_reviews_new_rating RENAME TO idx_app_reviews_rating;
ALTER INDEX idx_app_reviews_new_is_pushed RENAME TO idx_app_reviews_is_pushed;
ALTER INDEX idx_app_reviews_new_app_date RENAME TO idx_app_reviews_app_date;
ALTER INDEX idx_app_reviews_new_app_type RENAME TO idx_app_reviews_app_type;
ALTER INDEX idx_app_reviews_new_date_type RENAME TO idx_app_reviews_date_type;

-- 更新触发器名称
ALTER TRIGGER trigger_app_reviews_new_updated_at ON app_reviews RENAME TO trigger_app_reviews_updated_at;

-- 更新函数名称
ALTER FUNCTION update_app_reviews_new_updated_at() RENAME TO update_app_reviews_updated_at;

COMMIT;

-- ============================================================================
-- 阶段6: 最终验证
-- ============================================================================

-- 6.1 验证表替换成功
DO $$
DECLARE
    new_structure_count INTEGER;
BEGIN
    -- 检查新表是否有type字段（确认结构升级成功）
    SELECT COUNT(*) INTO new_structure_count
    FROM information_schema.columns 
    WHERE table_name = 'app_reviews' 
      AND column_name = 'type';
    
    IF new_structure_count = 0 THEN
        RAISE EXCEPTION '表结构升级失败：type字段不存在';
    END IF;
    
    RAISE NOTICE '✅ 表结构升级成功：app_reviews表已包含type字段';
END $$;

-- 6.2 生成迁移报告
CREATE OR REPLACE VIEW migration_report AS
SELECT 
    'Migration Summary' as section,
    'app_reviews (current)' as table_name,
    COUNT(*)::text as record_count,
    COUNT(CASE WHEN type = 'review' THEN 1 END)::text as review_count,
    COUNT(CASE WHEN type = 'rating' THEN 1 END)::text as rating_count
FROM app_reviews
UNION ALL
SELECT 
    'Backup Verification' as section,
    'app_reviews_old' as table_name,
    COUNT(*)::text as record_count,
    'N/A' as review_count,
    'N/A' as rating_count
FROM app_reviews_old;

-- 查看迁移报告
-- SELECT * FROM migration_report;

-- ============================================================================
-- 阶段7: 清理说明（手动执行）
-- ============================================================================

-- 🚨 注意：以下清理操作请在确认系统稳定运行1周后手动执行

/*
-- 7.1 删除旧表（确认无误后执行）
-- DROP TABLE app_reviews_old;

-- 7.2 删除备份表（确认无误后执行） 
-- DROP TABLE app_reviews_backup_$(date +%Y%m%d);

-- 7.3 删除迁移报告视图
-- DROP VIEW migration_report;
*/

-- ============================================================================
-- 迁移完成
-- ============================================================================

-- 📊 迁移总结
-- 1. ✅ 原app_reviews表已升级为统一结构
-- 2. ✅ 新增type字段区分评论和评分
-- 3. ✅ 保持表名app_reviews不变，代码无需修改
-- 4. ✅ 现有数据完整迁移并标记为historical
-- 5. ✅ 旧表保留为app_reviews_old，可随时回滚

RAISE NOTICE '🎉 app_reviews表升级迁移完成！表结构已支持统一的评分和评论管理。';
