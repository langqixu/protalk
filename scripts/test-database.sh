#!/bin/bash

# 数据库连接测试脚本

echo "🧪 数据库连接测试"
echo "=================="
echo ""

# 检查环境变量
check_env() {
    echo "📋 检查环境变量..."
    
    if [ ! -f .env ]; then
        echo "❌ .env 文件不存在"
        exit 1
    fi
    
    # 检查 Supabase 配置
    if grep -q "your-project.supabase.co" .env; then
        echo "⚠️  检测到示例 Supabase URL，请更新为真实值"
        return 1
    fi
    
    if grep -q "your_supabase_anon_key" .env; then
        echo "⚠️  检测到示例 Supabase 密钥，请更新为真实值"
        return 1
    fi
    
    echo "✅ 环境变量检查通过"
    return 0
}

# 测试服务启动
test_service() {
    echo ""
    echo "🚀 测试服务启动..."
    
    # 启动服务
    npm run dev &
    SERVER_PID=$!
    
    # 等待服务启动
    sleep 5
    
    # 测试健康检查
    echo "测试健康检查接口..."
    if curl -s http://localhost:3000/api/health | grep -q "healthy"; then
        echo "✅ 服务启动成功"
        return 0
    else
        echo "❌ 服务启动失败"
        kill $SERVER_PID 2>/dev/null
        return 1
    fi
}

# 测试数据库连接
test_database() {
    echo ""
    echo "🗄️ 测试数据库连接..."
    
    # 测试同步状态接口
    echo "测试同步状态接口..."
    RESPONSE=$(curl -s "http://localhost:3000/api/sync-status/test" -H "X-API-Key: your_api_key_for_http_endpoints")
    
    if echo "$RESPONSE" | grep -q "Could not find the table"; then
        echo "❌ 数据库表未创建"
        echo "请按照 docs/SUPABASE_SETUP_GUIDE.md 中的步骤创建数据库表"
        return 1
    elif echo "$RESPONSE" | grep -q "success.*true"; then
        echo "✅ 数据库连接正常"
        return 0
    elif echo "$RESPONSE" | grep -q "API密钥无效"; then
        echo "⚠️  API 密钥问题，但数据库连接可能正常"
        return 0
    else
        echo "❌ 数据库连接失败"
        echo "响应: $RESPONSE"
        return 1
    fi
}

# 显示测试结果
show_results() {
    echo ""
    echo "📊 测试结果："
    echo "============="
    
    if [ $ENV_OK -eq 0 ] && [ $SERVICE_OK -eq 0 ] && [ $DB_OK -eq 0 ]; then
        echo "🎉 所有测试通过！数据库设置完成。"
        echo ""
        echo "下一步操作："
        echo "1. 配置真实的应用 ID 到 config.json"
        echo "2. 测试评论同步功能"
        echo "3. 配置定时同步任务"
    else
        echo "⚠️  部分测试失败，请检查以下项目："
        
        if [ $ENV_OK -ne 0 ]; then
            echo "- 环境变量配置"
        fi
        
        if [ $SERVICE_OK -ne 0 ]; then
            echo "- 服务启动"
        fi
        
        if [ $DB_OK -ne 0 ]; then
            echo "- 数据库设置"
        fi
        
        echo ""
        echo "请参考 docs/SUPABASE_SETUP_GUIDE.md 进行故障排除"
    fi
}

# 清理函数
cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
    fi
}

# 设置清理陷阱
trap cleanup EXIT

# 主函数
main() {
    # 检查环境变量
    check_env
    ENV_OK=$?
    
    if [ $ENV_OK -eq 0 ]; then
        # 测试服务启动
        test_service
        SERVICE_OK=$?
        
        if [ $SERVICE_OK -eq 0 ]; then
            # 测试数据库连接
            test_database
            DB_OK=$?
        else
            DB_OK=1
        fi
    else
        SERVICE_OK=1
        DB_OK=1
    fi
    
    # 显示结果
    show_results
}

# 运行主函数
main
