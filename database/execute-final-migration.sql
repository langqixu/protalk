-- 执行最终的app_reviews表升级迁移
-- 目标：保持表名，升级结构，采用API原始字段命名

-- ============================================================================
-- 执行前检查
-- ============================================================================

DO $$
DECLARE
    current_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO current_count FROM app_reviews;
    RAISE NOTICE '📊 当前app_reviews表记录数：%', current_count;
    
    IF current_count = 0 THEN
        RAISE WARNING '⚠️  当前表为空，请确认这是预期的状态';
    END IF;
END $$;

-- ============================================================================
-- 阶段1: 安全备份
-- ============================================================================

-- 创建带时间戳的备份表
DO $$
DECLARE
    backup_table_name TEXT;
BEGIN
    backup_table_name := 'app_reviews_backup_' || to_char(NOW(), 'YYYYMMDD_HH24MISS');
    EXECUTE format('CREATE TABLE %I AS SELECT * FROM app_reviews', backup_table_name);
    RAISE NOTICE '✅ 备份表创建成功：%', backup_table_name;
END $$;

-- ============================================================================
-- 阶段2: 执行新表结构创建
-- ============================================================================

\echo '📋 正在创建新的表结构...'
\i final-app-reviews-schema.sql

-- ============================================================================
-- 阶段3: 验证新表和数据
-- ============================================================================

-- 验证新表数据
DO $$
DECLARE
    original_count INTEGER;
    new_count INTEGER;
    review_type_count INTEGER;
    rating_only_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO original_count FROM app_reviews;
    SELECT COUNT(*) INTO new_count FROM app_reviews_new;
    SELECT COUNT(*) INTO review_type_count FROM app_reviews_new WHERE data_type = 'review';
    SELECT COUNT(*) INTO rating_only_count FROM app_reviews_new WHERE data_type = 'rating_only';
    
    RAISE NOTICE '📊 数据验证结果：';
    RAISE NOTICE '   原表记录数：%', original_count;
    RAISE NOTICE '   新表记录数：%', new_count;
    RAISE NOTICE '   完整评论数：%', review_type_count;
    RAISE NOTICE '   纯评分数：%', rating_only_count;
    
    IF original_count != new_count THEN
        RAISE EXCEPTION '❌ 数据迁移失败：记录数不匹配';
    END IF;
    
    RAISE NOTICE '✅ 数据验证通过';
END $$;

-- ============================================================================
-- 阶段4: 原子性表替换
-- ============================================================================

\echo '🔄 开始原子性表替换...'

BEGIN;

-- 重命名表：原表 -> 旧表，新表 -> 正式表
ALTER TABLE app_reviews RENAME TO app_reviews_old;
ALTER TABLE app_reviews_new RENAME TO app_reviews;

-- 重命名索引以保持一致性
ALTER INDEX idx_app_reviews_new_review_id RENAME TO idx_app_reviews_review_id;
ALTER INDEX idx_app_reviews_new_app_id RENAME TO idx_app_reviews_app_id;
ALTER INDEX idx_app_reviews_new_rating RENAME TO idx_app_reviews_rating;
ALTER INDEX idx_app_reviews_new_created_date RENAME TO idx_app_reviews_created_date;
ALTER INDEX idx_app_reviews_new_is_edited RENAME TO idx_app_reviews_is_edited;
ALTER INDEX idx_app_reviews_new_data_type RENAME TO idx_app_reviews_data_type;
ALTER INDEX idx_app_reviews_new_is_pushed RENAME TO idx_app_reviews_is_pushed;
ALTER INDEX idx_app_reviews_new_push_type RENAME TO idx_app_reviews_push_type;

-- 重命名复合索引
ALTER INDEX idx_app_reviews_new_app_date RENAME TO idx_app_reviews_app_date;
ALTER INDEX idx_app_reviews_new_app_rating RENAME TO idx_app_reviews_app_rating;
ALTER INDEX idx_app_reviews_new_app_type RENAME TO idx_app_reviews_app_type;
ALTER INDEX idx_app_reviews_new_date_type RENAME TO idx_app_reviews_date_type;
ALTER INDEX idx_app_reviews_new_rating_type RENAME TO idx_app_reviews_rating_type;
ALTER INDEX idx_app_reviews_new_sync_status RENAME TO idx_app_reviews_sync_status;
ALTER INDEX idx_app_reviews_new_first_sync RENAME TO idx_app_reviews_first_sync;
ALTER INDEX idx_app_reviews_new_app_sync RENAME TO idx_app_reviews_app_sync;

-- 重命名触发器和函数
ALTER TRIGGER trigger_app_reviews_new_updated_at ON app_reviews RENAME TO trigger_app_reviews_updated_at;
ALTER TRIGGER trigger_app_reviews_new_data_type ON app_reviews RENAME TO trigger_app_reviews_data_type;

ALTER FUNCTION update_app_reviews_new_updated_at() RENAME TO update_app_reviews_updated_at;
ALTER FUNCTION set_app_reviews_new_data_type() RENAME TO set_app_reviews_data_type;

COMMIT;

\echo '✅ 表替换完成'

-- ============================================================================
-- 阶段5: 最终验证
-- ============================================================================

-- 验证新表结构
DO $$
DECLARE
    has_review_id BOOLEAN;
    has_data_type BOOLEAN;
    has_reviewer_nickname BOOLEAN;
    has_created_date BOOLEAN;
    table_count INTEGER;
BEGIN
    -- 检查关键字段是否存在
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' AND column_name = 'review_id'
    ) INTO has_review_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' AND column_name = 'data_type'
    ) INTO has_data_type;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' AND column_name = 'reviewer_nickname'
    ) INTO has_reviewer_nickname;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_reviews' AND column_name = 'created_date'
    ) INTO has_created_date;
    
    SELECT COUNT(*) INTO table_count FROM app_reviews;
    
    RAISE NOTICE '🔍 表结构验证：';
    RAISE NOTICE '   review_id字段：%', CASE WHEN has_review_id THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   data_type字段：%', CASE WHEN has_data_type THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   reviewer_nickname字段：%', CASE WHEN has_reviewer_nickname THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   created_date字段：%', CASE WHEN has_created_date THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   总记录数：%', table_count;
    
    IF NOT (has_review_id AND has_data_type AND has_reviewer_nickname AND has_created_date) THEN
        RAISE EXCEPTION '❌ 表结构验证失败：关键字段缺失';
    END IF;
    
    RAISE NOTICE '✅ 表结构验证通过';
END $$;

-- ============================================================================
-- 阶段6: 生成迁移报告
-- ============================================================================

-- 创建迁移完成报告
SELECT 
    '🎉 App Reviews 表升级迁移完成报告' as title,
    '' as divider;

SELECT 
    '📊 数据统计' as section,
    COUNT(*) as total_records,
    COUNT(CASE WHEN data_type = 'review' THEN 1 END) as review_count,
    COUNT(CASE WHEN data_type = 'rating_only' THEN 1 END) as rating_only_count,
    AVG(rating)::DECIMAL(3,2) as average_rating
FROM app_reviews;

SELECT 
    '🔧 新字段说明' as section,
    'review_id: API原始ID' as field_1,
    'reviewer_nickname: API原始昵称字段' as field_2,
    'created_date: API原始时间字段' as field_3,
    'data_type: 自动区分review/rating_only' as field_4;

-- ============================================================================
-- 清理指导
-- ============================================================================

\echo ''
\echo '🎯 迁移完成！'
\echo ''
\echo '📋 后续步骤：'
\echo '1. 测试应用功能确保正常运行'
\echo '2. 观察1-2天确认稳定性'
\echo '3. 确认无误后可执行清理脚本：'
\echo '   DROP TABLE app_reviews_old;'
\echo '   DROP TABLE app_reviews_backup_*;'
\echo ''
\echo '📈 新功能：'
\echo '   - 使用API原始字段命名'
\echo '   - 自动区分评论和纯评分'
\echo '   - 支持更精确的变更检测'
\echo '   - 为未来扩展预留字段'
\echo ''

-- 显示便捷查询视图
\echo '📊 便捷查询视图已创建：'
\echo '   SELECT * FROM v_app_reviews_summary;'
\echo '   SELECT * FROM v_app_reviews_push_status;'
