#!/bin/bash

# 数据库设置脚本
# 帮助用户快速设置 Supabase 数据库

echo "🗄️  App Store 评论服务 - 数据库设置"
echo "====================================="
echo ""

# 检查是否已安装必要的工具
check_dependencies() {
    echo "📋 检查依赖..."
    
    if ! command -v curl &> /dev/null; then
        echo "❌ curl 未安装，请先安装 curl"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        echo "⚠️  jq 未安装，建议安装 jq 以获得更好的输出格式"
    fi
    
    echo "✅ 依赖检查完成"
    echo ""
}

# 显示设置步骤
show_steps() {
    echo "📝 数据库设置步骤："
    echo ""
    echo "1. 创建 Supabase 项目"
    echo "   - 访问 https://supabase.com"
    echo "   - 登录并创建新项目"
    echo "   - 记录项目 URL 和匿名密钥"
    echo ""
    echo "2. 配置环境变量"
    echo "   - 编辑 .env 文件"
    echo "   - 填入 SUPABASE_URL 和 SUPABASE_ANON_KEY"
    echo ""
    echo "3. 执行数据库初始化脚本"
    echo "   - 在 Supabase 仪表板中执行 database/init.sql"
    echo ""
    echo "4. 测试连接"
    echo "   - 启动服务并测试 API 接口"
    echo ""
}

# 验证环境变量
check_env_vars() {
    echo "🔍 检查环境变量..."
    
    if [ ! -f .env ]; then
        echo "❌ .env 文件不存在"
        echo "请先复制 env.example 到 .env 并配置您的设置"
        exit 1
    fi
    
    # 检查 Supabase 配置
    if ! grep -q "SUPABASE_URL=" .env; then
        echo "❌ .env 文件中缺少 SUPABASE_URL"
        exit 1
    fi
    
    if ! grep -q "SUPABASE_ANON_KEY=" .env; then
        echo "❌ .env 文件中缺少 SUPABASE_ANON_KEY"
        exit 1
    fi
    
    # 检查是否为示例值
    if grep -q "your-project.supabase.co" .env; then
        echo "⚠️  检测到示例 Supabase URL，请更新为真实值"
    fi
    
    if grep -q "your_supabase_anon_key" .env; then
        echo "⚠️  检测到示例 Supabase 密钥，请更新为真实值"
    fi
    
    echo "✅ 环境变量检查完成"
    echo ""
}

# 显示 SQL 脚本内容
show_sql_script() {
    echo "📄 数据库初始化脚本内容："
    echo "文件位置: database/init.sql"
    echo ""
    echo "主要创建的表："
    echo "- app_reviews: 评论数据表"
    echo "- sync_log: 同步日志表"
    echo ""
    echo "主要创建的视图："
    echo "- app_review_stats: 评论统计视图"
    echo "- recent_reviews: 最近评论视图"
    echo ""
    echo "主要创建的索引："
    echo "- 应用ID索引"
    echo "- 评论日期索引"
    echo "- 评分索引"
    echo "- 复合索引等"
    echo ""
}

# 测试数据库连接
test_connection() {
    echo "🧪 测试数据库连接..."
    
    # 启动服务
    echo "启动服务..."
    npm run dev &
    SERVER_PID=$!
    
    # 等待服务启动
    sleep 5
    
    # 测试健康检查
    echo "测试健康检查接口..."
    if curl -s http://localhost:3000/api/health | grep -q "healthy"; then
        echo "✅ 服务启动成功"
    else
        echo "❌ 服务启动失败"
        kill $SERVER_PID 2>/dev/null
        exit 1
    fi
    
    # 测试数据库连接
    echo "测试数据库连接..."
    if curl -s "http://localhost:3000/api/sync-status/test" -H "X-API-Key: your_api_key_for_http_endpoints" | grep -q "Could not find the table"; then
        echo "⚠️  数据库表未创建，请执行 database/init.sql 脚本"
    elif curl -s "http://localhost:3000/api/sync-status/test" -H "X-API-Key: your_api_key_for_http_endpoints" | grep -q "success"; then
        echo "✅ 数据库连接正常"
    else
        echo "❌ 数据库连接失败，请检查配置"
    fi
    
    # 停止服务
    kill $SERVER_PID 2>/dev/null
    echo ""
}

# 显示下一步操作
show_next_steps() {
    echo "🚀 下一步操作："
    echo ""
    echo "1. 在 Supabase 仪表板中执行 database/init.sql 脚本"
    echo "2. 启动服务：npm run dev"
    echo "3. 测试 API 接口："
    echo "   curl http://localhost:3000/api/health"
    echo "4. 配置真实的应用 ID 到 config.json"
    echo "5. 测试评论同步功能"
    echo ""
    echo "📚 更多信息："
    echo "- 详细文档：docs/DATABASE_SETUP.md"
    echo "- API 文档：docs/API.md"
    echo "- 项目说明：README.md"
    echo ""
}

# 主函数
main() {
    check_dependencies
    show_steps
    
    read -p "是否继续检查环境变量？(y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        check_env_vars
        show_sql_script
        
        read -p "是否测试数据库连接？(y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            test_connection
        fi
    fi
    
    show_next_steps
}

# 运行主函数
main
