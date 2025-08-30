# 🚀 数据库迁移执行指南

> **🚨 DEPRECATED**: 该文档为历史数据库迁移记录，迁移已完成。保留仅供历史参考。

## ⚠️ 重要提醒
这个迁移会**完全替换**现有的数据库结构。因为您确认历史数据不重要，我们将执行清理式迁移。

## 📋 执行步骤

### 1. 登录 Supabase Dashboard
1. 打开 [Supabase Dashboard](https://app.supabase.com/)
2. 选择您的项目
3. 进入 **SQL Editor**

### 2. 执行迁移脚本
将以下完整SQL脚本复制粘贴到SQL编辑器中并执行：

```sql
-- 迁移到最新数据库架构
-- 简化设计：移除向下兼容，统一使用AppReview结构
-- ⚠️ 注意：此操作会清空现有数据，请确保历史数据不重要

-- ============================================================================
-- 阶段1: 删除现有结构
-- ============================================================================

-- 删除现有触发器
DROP TRIGGER IF EXISTS update_app_reviews_updated_at ON app_reviews;
DROP TRIGGER IF EXISTS trigger_app_reviews_new_updated_at ON app_reviews;
DROP TRIGGER IF EXISTS trigger_app_reviews_new_data_type ON app_reviews;

-- 删除其他表中依赖的触发器
DROP TRIGGER IF EXISTS update_sync_log_updated_at ON sync_log;

-- 删除现有函数（使用CASCADE处理依赖）
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_app_reviews_new_updated_at() CASCADE;
DROP FUNCTION IF EXISTS set_app_reviews_new_data_type() CASCADE;

-- 删除现有视图
DROP VIEW IF EXISTS app_review_stats;
DROP VIEW IF EXISTS v_app_reviews_summary;
DROP VIEW IF EXISTS v_app_reviews_push_status;

-- 删除现有索引
DROP INDEX IF EXISTS idx_app_reviews_app_id;
DROP INDEX IF EXISTS idx_app_reviews_review_date;
DROP INDEX IF EXISTS idx_app_reviews_rating;
DROP INDEX IF EXISTS idx_app_reviews_created_at;
DROP INDEX IF EXISTS idx_app_reviews_app_date;
DROP INDEX IF EXISTS idx_app_reviews_app_rating;

-- 删除现有表
DROP TABLE IF EXISTS app_reviews;

-- ============================================================================
-- 阶段2: 创建最新表结构
-- ============================================================================

CREATE TABLE app_reviews (
    -- 主键和标识
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id VARCHAR(255) UNIQUE NOT NULL,      -- App Store Connect API的唯一ID
    app_id VARCHAR(255) NOT NULL,                -- 应用ID
    
    -- App Store Connect API 原始字段（保持命名一致）
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,                                  -- 评论标题（API可选）
    body TEXT,                                   -- 评论内容（API可为空）
    reviewer_nickname VARCHAR(255) NOT NULL,     -- API原始字段名
    created_date TIMESTAMP NOT NULL,             -- API原始时间字段
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,    -- API原始编辑标记
    
    -- 开发者回复数据（来自customerReviewResponses）
    response_body TEXT,                          -- 开发者回复内容
    response_date TIMESTAMP,                     -- 开发者回复时间
    
    -- 二级定义字段（业务逻辑分类）
    data_type VARCHAR(20) NOT NULL DEFAULT 'review' 
        CHECK (data_type IN ('review', 'rating_only')),
    
    -- 同步控制字段
    first_sync_at TIMESTAMP DEFAULT NOW(),       -- 首次同步时间
    is_pushed BOOLEAN DEFAULT FALSE,             -- 是否已推送
    push_type VARCHAR(20) CHECK (push_type IN ('new', 'historical', 'updated')),
    
    -- 扩展字段（预留）
    territory_code VARCHAR(10),                  -- 国家/地区代码
    app_version VARCHAR(50),                     -- 应用版本
    review_state VARCHAR(20),                    -- 评论状态
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT NOW(),          -- 记录创建时间
    updated_at TIMESTAMP DEFAULT NOW()           -- 记录更新时间
);

-- ============================================================================
-- 阶段3: 创建优化索引
-- ============================================================================

-- 主要索引
CREATE INDEX idx_app_reviews_review_id ON app_reviews(review_id);
CREATE INDEX idx_app_reviews_app_id ON app_reviews(app_id);
CREATE INDEX idx_app_reviews_rating ON app_reviews(rating);
CREATE INDEX idx_app_reviews_created_date ON app_reviews(created_date);
CREATE INDEX idx_app_reviews_is_edited ON app_reviews(is_edited);

-- 业务逻辑索引
CREATE INDEX idx_app_reviews_data_type ON app_reviews(data_type);
CREATE INDEX idx_app_reviews_is_pushed ON app_reviews(is_pushed);
CREATE INDEX idx_app_reviews_push_type ON app_reviews(push_type);

-- 复合索引（优化常见查询）
CREATE INDEX idx_app_reviews_app_date ON app_reviews(app_id, created_date);
CREATE INDEX idx_app_reviews_app_rating ON app_reviews(app_id, rating);
CREATE INDEX idx_app_reviews_app_type ON app_reviews(app_id, data_type);
CREATE INDEX idx_app_reviews_date_type ON app_reviews(created_date, data_type);
CREATE INDEX idx_app_reviews_rating_type ON app_reviews(rating, data_type);

-- 同步相关复合索引
CREATE INDEX idx_app_reviews_sync_status ON app_reviews(is_pushed, push_type);
CREATE INDEX idx_app_reviews_first_sync ON app_reviews(first_sync_at);
CREATE INDEX idx_app_reviews_app_sync ON app_reviews(app_id, first_sync_at);

-- ============================================================================
-- 阶段4: 创建触发器和函数
-- ============================================================================

-- 通用的updated_at更新函数（重新创建，供所有表使用）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- app_reviews表专用的updated_at触发器
CREATE OR REPLACE FUNCTION update_app_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_app_reviews_updated_at
    BEFORE UPDATE ON app_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_app_reviews_updated_at();

-- 恢复sync_log表的触发器（如果表存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_log') THEN
        EXECUTE 'CREATE TRIGGER update_sync_log_updated_at 
                 BEFORE UPDATE ON sync_log 
                 FOR EACH ROW 
                 EXECUTE FUNCTION update_updated_at_column()';
    END IF;
END $$;

-- 自动设置data_type的触发器
CREATE OR REPLACE FUNCTION set_app_reviews_data_type()
RETURNS TRIGGER AS $$
BEGIN
    -- 基于body内容自动判断data_type
    IF NEW.body IS NOT NULL AND TRIM(NEW.body) != '' THEN
        NEW.data_type = 'review';
    ELSE
        NEW.data_type = 'rating_only';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_app_reviews_data_type
    BEFORE INSERT OR UPDATE ON app_reviews
    FOR EACH ROW
    EXECUTE FUNCTION set_app_reviews_data_type();

-- ============================================================================
-- 阶段5: 创建便捷视图
-- ============================================================================

-- 应用评论汇总统计视图
CREATE VIEW v_app_reviews_summary AS
SELECT 
    app_id,
    data_type,
    COUNT(*) as total_count,
    AVG(rating) as average_rating,
    COUNT(CASE WHEN response_body IS NOT NULL THEN 1 END) as replied_count,
    MAX(created_date) as latest_review_date,
    MIN(created_date) as earliest_review_date
FROM app_reviews
GROUP BY app_id, data_type;

-- 推送状态统计视图
CREATE VIEW v_app_reviews_push_status AS
SELECT 
    app_id,
    data_type,
    push_type,
    is_pushed,
    COUNT(*) as count
FROM app_reviews
GROUP BY app_id, data_type, push_type, is_pushed;

-- ============================================================================
-- 阶段6: 添加表注释
-- ============================================================================

-- 表注释
COMMENT ON TABLE app_reviews IS '基于App Store Connect API设计的统一评论表，使用API原始字段命名';

-- 字段注释
COMMENT ON COLUMN app_reviews.review_id IS 'App Store Connect API返回的唯一评论ID';
COMMENT ON COLUMN app_reviews.rating IS '1-5星评分';
COMMENT ON COLUMN app_reviews.title IS '评论标题';
COMMENT ON COLUMN app_reviews.body IS '评论内容';
COMMENT ON COLUMN app_reviews.reviewer_nickname IS '评论者昵称';
COMMENT ON COLUMN app_reviews.created_date IS '评论创建时间';
COMMENT ON COLUMN app_reviews.is_edited IS '是否编辑过';
COMMENT ON COLUMN app_reviews.response_body IS '开发者回复内容';
COMMENT ON COLUMN app_reviews.response_date IS '开发者回复时间';
COMMENT ON COLUMN app_reviews.data_type IS '数据类型：review(完整评论) 或 rating_only(纯评分)';
COMMENT ON COLUMN app_reviews.first_sync_at IS '首次同步到系统的时间';
COMMENT ON COLUMN app_reviews.is_pushed IS '是否已推送到飞书';
COMMENT ON COLUMN app_reviews.push_type IS '推送类型：new(新增)、historical(历史)、updated(更新)';

-- 视图注释
COMMENT ON VIEW v_app_reviews_summary IS '应用评论汇总统计视图';
COMMENT ON VIEW v_app_reviews_push_status IS '应用评论推送状态统计视图';

-- ============================================================================
-- 完成确认和验证
-- ============================================================================

-- 验证表创建
SELECT 
    '✅ app_reviews表创建成功' as migration_status,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'app_reviews' 
AND table_schema = 'public';

-- 验证索引创建
SELECT 
    '✅ 索引创建成功' as index_status,
    COUNT(*) as index_count
FROM pg_indexes 
WHERE tablename = 'app_reviews';

-- 验证视图创建
SELECT 
    '✅ 视图创建成功' as view_status,
    COUNT(*) as view_count
FROM information_schema.views 
WHERE table_name IN ('v_app_reviews_summary', 'v_app_reviews_push_status');

-- 显示迁移完成信息
SELECT 
    '🎉 数据库架构迁移完成！' as message,
    '📊 新表结构基于App Store Connect API设计' as info1,
    '🚀 已简化为单一数据模型，移除向下兼容代码' as info2,
    '🔍 可执行 SELECT * FROM v_app_reviews_summary; 查看统计信息' as info3;
```

### 3. 验证迁移成功
执行迁移后，运行以下查询验证：

```sql
-- 验证表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'app_reviews' 
ORDER BY ordinal_position;

-- 验证索引
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'app_reviews';

-- 验证视图
SELECT * FROM v_app_reviews_summary LIMIT 1;
```

## ✅ 迁移完成确认

一旦执行成功，您将看到：
1. **新的表结构** - 基于App Store Connect API字段命名
2. **优化的索引** - 提升查询性能
3. **自动触发器** - 管理数据类型和更新时间
4. **统计视图** - 便于监控和分析

## 🔄 下一步
迁移完成后，我将立即修复代码编译错误，确保应用可以正常运行。

---
**⏰ 预计执行时间**: 2-3分钟  
**💥 影响范围**: 完全替换app_reviews表结构  
**🎯 收益**: 简化架构，提升性能，为未来功能扩展铺路
