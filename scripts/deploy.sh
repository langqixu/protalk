#!/bin/bash

# 飞书长连接架构部署脚本
# 版本: v2.0.0

set -e  # 遇到错误立即退出

echo "🚀 开始部署飞书长连接架构..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查环境变量
check_env() {
    log_info "检查环境变量..."
    
    required_vars=(
        "APP_STORE_ISSUER_ID"
        "APP_STORE_KEY_ID"
        "APP_STORE_PRIVATE_KEY"
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
        "FEISHU_WEBHOOK_URL"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "缺少必需的环境变量:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
    
    # 检查飞书配置
    if [ -z "$FEISHU_APP_ID" ] || [ -z "$FEISHU_APP_SECRET" ]; then
        log_warning "飞书机器人配置不完整，将使用Webhook模式"
    else
        log_success "飞书机器人配置完整"
    fi
    
    log_success "环境变量检查完成"
}

# 安装依赖
install_deps() {
    log_info "安装依赖..."
    
    if [ ! -d "node_modules" ]; then
        npm install
        log_success "依赖安装完成"
    else
        log_info "依赖已存在，跳过安装"
    fi
}

# 构建项目
build_project() {
    log_info "构建项目..."
    
    npm run build
    
    if [ $? -eq 0 ]; then
        log_success "项目构建成功"
    else
        log_error "项目构建失败"
        exit 1
    fi
}

# 运行测试
run_tests() {
    log_info "运行测试..."
    
    # 检查是否有测试文件
    if [ -f "src/test-feishu-service.ts" ]; then
        log_warning "发现测试文件，跳过测试（生产环境）"
    else
        log_info "没有测试文件，跳过测试"
    fi
}

# 检查端口占用
check_port() {
    local port=${PORT:-3000}
    log_info "检查端口 $port 占用情况..."
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        log_warning "端口 $port 已被占用"
        echo "占用进程:"
        lsof -Pi :$port -sTCP:LISTEN
        read -p "是否继续？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        log_success "端口 $port 可用"
    fi
}

# 启动应用
start_app() {
    log_info "启动应用..."
    
    # 创建日志目录
    mkdir -p logs
    
    # 启动应用
    if [ "$NODE_ENV" = "production" ]; then
        log_info "生产环境启动..."
        npm start
    else
        log_info "开发环境启动..."
        npx ts-node src/index.ts
    fi
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local port=${PORT:-3000}
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$port/api/health" > /dev/null; then
            log_success "应用启动成功！"
            echo "健康检查地址: http://localhost:$port/api/health"
            echo "飞书服务状态: http://localhost:$port/feishu/status"
            return 0
        fi
        
        log_info "等待应用启动... ($attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    log_error "应用启动超时"
    return 1
}

# 显示部署信息
show_deployment_info() {
    log_success "部署完成！"
    echo
    echo "📋 部署信息:"
    echo "  - 应用地址: http://localhost:${PORT:-3000}"
    echo "  - 健康检查: http://localhost:${PORT:-3000}/api/health"
    echo "  - 飞书状态: http://localhost:${PORT:-3000}/feishu/status"
    echo
    echo "🔧 管理命令:"
    echo "  - 查看状态: curl http://localhost:${PORT:-3000}/feishu/status"
    echo "  - 切换模式: curl -X POST -H 'Content-Type: application/json' -d '{\"mode\":\"eventsource\"}' http://localhost:${PORT:-3000}/feishu/switch-mode"
    echo "  - 重新连接: curl -X POST http://localhost:${PORT:-3000}/feishu/reconnect"
    echo
    echo "📝 日志文件:"
    echo "  - 综合日志: logs/combined.log"
    echo "  - 错误日志: logs/error.log"
}

# 主函数
main() {
    echo "=================================="
    echo "  飞书长连接架构部署脚本 v2.0.0"
    echo "=================================="
    echo
    
    check_env
    install_deps
    build_project
    run_tests
    check_port
    
    # 启动应用（后台运行）
    start_app &
    local app_pid=$!
    
    # 等待应用启动
    sleep 3
    
    # 健康检查
    if health_check; then
        show_deployment_info
        echo
        log_info "应用进程ID: $app_pid"
        echo "使用 'kill $app_pid' 停止应用"
    else
        log_error "部署失败"
        kill $app_pid 2>/dev/null || true
        exit 1
    fi
}

# 执行主函数
main "$@"
