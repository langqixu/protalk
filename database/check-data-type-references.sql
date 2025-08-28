-- 检查数据库中可能遗留的 data_type 字段引用

-- 1. 检查是否还有触发器引用 data_type
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE action_statement LIKE '%data_type%';

-- 2. 检查是否还有视图引用 data_type
SELECT 
    table_name,
    view_definition
FROM information_schema.views 
WHERE view_definition LIKE '%data_type%';

-- 3. 检查是否还有函数引用 data_type
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition LIKE '%data_type%';

-- 4. 检查表结构，确认 data_type 字段已删除
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'app_reviews' 
ORDER BY ordinal_position;

-- 5. 如果发现有触发器引用 data_type，删除它们
-- DROP TRIGGER IF EXISTS <trigger_name> ON app_reviews;

-- 6. 如果发现有视图引用 data_type，删除它们
-- DROP VIEW IF EXISTS <view_name>;
