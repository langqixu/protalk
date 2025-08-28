#!/bin/bash

# 飞书服务监控脚本
# 版本: v2.0.0

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
PORT=${PORT:-3000}
CHECK_INTERVAL=${CHECK_INTERVAL:-30}  # 检查间隔（秒）
MAX_FAILURES=${MAX_FAILURES:-3}       # 最大失败次数

# 状态变量
failure_count=0
last_check_time=""

# 日志函数
log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR]${NC} $1"
}

# 检查应用健康状态
check_health() {
    local response=$(curl -s -w "%{http_code}" "http://localhost:$PORT/api/health" 2>/dev/null)
    local http_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        echo "$body"
        return 0
    else
        return 1
    fi
}

# 检查飞书服务状态
check_feishu_status() {
    local response=$(curl -s -w "%{http_code}" "http://localhost:$PORT/feishu/status" 2>/dev/null)
    local http_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        echo "$body"
        return 0
    else
        return 1
    fi
}

# 解析JSON状态
parse_status() {
    local json="$1"
    local key="$2"
    
    echo "$json" | grep -o "\"$key\":[^,}]*" | cut -d':' -f2 | tr -d '"' | tr -d ' '
}

# 显示状态信息
show_status() {
    local health_json="$1"
    local feishu_json="$2"
    
    echo "=================================="
    echo "  飞书服务监控状态"
    echo "=================================="
    echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "端口: $PORT"
    echo
    
    # 应用健康状态
    if [ -n "$health_json" ]; then
        local status=$(parse_status "$health_json" "status")
        local timestamp=$(parse_status "$health_json" "timestamp")
        echo "📊 应用状态: $status"
        echo "🕐 最后更新: $timestamp"
    else
        echo "📊 应用状态: ❌ 不可用"
    fi
    
    echo
    
    # 飞书服务状态
    if [ -n "$feishu_json" ]; then
        local current_mode=$(parse_status "$feishu_json" "currentMode")
        local is_healthy=$(parse_status "$feishu_json" "isHealthy")
        local connected=$(parse_status "$feishu_json" "connected")
        local message_count=$(parse_status "$feishu_json" "messageCount")
        local error_count=$(parse_status "$feishu_json" "errorCount")
        
        echo "🤖 飞书服务状态:"
        echo "  - 当前模式: $current_mode"
        echo "  - 服务健康: $is_healthy"
        echo "  - 连接状态: $connected"
        echo "  - 消息计数: $message_count"
        echo "  - 错误计数: $error_count"
    else
        echo "🤖 飞书服务状态: ❌ 不可用"
    fi
    
    echo
    echo "🔧 管理命令:"
    echo "  - 查看详细状态: curl http://localhost:$PORT/feishu/status | jq"
    echo "  - 切换模式: curl -X POST -H 'Content-Type: application/json' -d '{\"mode\":\"eventsource\"}' http://localhost:$PORT/feishu/switch-mode"
    echo "  - 重新连接: curl -X POST http://localhost:$PORT/feishu/reconnect"
    echo
}

# 执行健康检查
perform_health_check() {
    log_info "执行健康检查..."
    
    # 检查应用健康状态
    local health_response=$(check_health)
    local health_status=$?
    
    # 检查飞书服务状态
    local feishu_response=$(check_feishu_status)
    local feishu_status=$?
    
    if [ $health_status -eq 0 ] && [ $feishu_status -eq 0 ]; then
        log_success "所有服务正常"
        failure_count=0
        show_status "$health_response" "$feishu_response"
    else
        ((failure_count++))
        log_warning "服务检查失败 ($failure_count/$MAX_FAILURES)"
        
        if [ $health_status -ne 0 ]; then
            log_error "应用健康检查失败"
        fi
        
        if [ $feishu_status -ne 0 ]; then
            log_error "飞书服务状态检查失败"
        fi
        
        show_status "$health_response" "$feishu_response"
        
        # 检查是否超过最大失败次数
        if [ $failure_count -ge $MAX_FAILURES ]; then
            log_error "连续失败次数超过阈值 ($MAX_FAILURES)，建议检查服务状态"
            echo
            echo "💡 建议操作:"
            echo "  1. 检查应用日志: tail -f logs/combined.log"
            echo "  2. 重启应用: npm start"
            echo "  3. 检查网络连接"
            echo "  4. 验证飞书配置"
        fi
    fi
    
    last_check_time=$(date '+%Y-%m-%d %H:%M:%S')
}

# 显示帮助信息
show_help() {
    echo "飞书服务监控脚本 v2.0.0"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  -h, --help          显示此帮助信息"
    echo "  -p, --port PORT     指定端口号 (默认: 3000)"
    echo "  -i, --interval SEC  检查间隔秒数 (默认: 30)"
    echo "  -m, --max-failures N 最大失败次数 (默认: 3)"
    echo "  -o, --once          只执行一次检查"
    echo
    echo "示例:"
    echo "  $0                    # 默认监控"
    echo "  $0 -p 8080           # 监控端口8080"
    echo "  $0 -i 60 -m 5        # 60秒间隔，5次失败阈值"
    echo "  $0 -o                # 执行一次检查"
}

# 主函数
main() {
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -p|--port)
                PORT="$2"
                shift 2
                ;;
            -i|--interval)
                CHECK_INTERVAL="$2"
                shift 2
                ;;
            -m|--max-failures)
                MAX_FAILURES="$2"
                shift 2
                ;;
            -o|--once)
                perform_health_check
                exit 0
                ;;
            *)
                echo "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    echo "=================================="
    echo "  飞书服务监控脚本 v2.0.0"
    echo "=================================="
    echo "监控端口: $PORT"
    echo "检查间隔: ${CHECK_INTERVAL}秒"
    echo "失败阈值: $MAX_FAILURES"
    echo "按 Ctrl+C 停止监控"
    echo
    
    # 执行初始检查
    perform_health_check
    
    # 开始循环监控
    while true; do
        sleep $CHECK_INTERVAL
        perform_health_check
    done
}

# 捕获Ctrl+C信号
trap 'echo; log_info "监控已停止"; exit 0' INT

# 执行主函数
main "$@"
