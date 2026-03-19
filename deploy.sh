#!/bin/bash

#===============================================================================
# CKAnim 生产环境部署脚本
# 
# 使用方法:
#   ./deploy.sh              # 完整部署（构建 + 启动）
#   ./deploy.sh build        # 仅构建
#   ./deploy.sh start        # 仅启动
#   ./deploy.sh restart      # 重启所有服务
#   ./deploy.sh stop         # 停止所有服务
#   ./deploy.sh logs         # 查看日志
#===============================================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js 18+"
        exit 1
    fi
    
    if ! command -v pm2 &> /dev/null; then
        log_warn "PM2 未安装，正在安装..."
        npm install -g pm2
    fi
    
    log_info "Node 版本：$(node -v)"
    log_info "NPM 版本：$(npm -v)"
    log_info "PM2 版本：$(pm2 -v)"
}

# 安装依赖
install_dependencies() {
    log_info "安装依赖..."
    
    # 根目录（前台）
    log_info "安装前台依赖..."
    npm install
    
    # 后端
    log_info "安装后端依赖..."
    cd server
    npm install
    cd ..
    
    # 管理后台
    log_info "安装后台依赖..."
    cd admin
    npm install
    cd ..
    
    log_info "依赖安装完成 ✅"
}

# 构建项目
build() {
    log_info "开始构建..."
    
    # 构建前台
    log_info "构建前台网站..."
    npm run build
    
    # 构建后台
    log_info "构建管理后台..."
    cd admin
    npm run build
    cd ..
    
    # 生成 Prisma 客户端
    log_info "生成 Prisma 客户端..."
    cd server
    npm run db:generate
    cd ..
    
    log_info "构建完成 ✅"
}

# 创建日志目录
setup_logs() {
    log_info "创建日志目录..."
    mkdir -p logs
    mkdir -p server/logs
    mkdir -p admin/logs
    log_info "日志目录创建完成 ✅"
}

# 启动服务
start() {
    log_info "启动服务..."
    
    # 检查 PM2 是否运行
    if ! pm2 list &> /dev/null; then
        log_error "PM2 未运行，请先启动 PM2"
        exit 1
    fi
    
    # 启动所有服务
    pm2 start ecosystem.config.js
    
    # 等待服务启动
    sleep 3
    
    # 显示状态
    pm2 status
    
    log_info "服务启动完成 ✅"
    
    # 显示访问地址
    echo ""
    log_info "访问地址:"
    log_info "  前台网站：http://localhost:5173"
    log_info "  管理后台：http://localhost:3003"
    log_info "  后端 API:  http://localhost:3002"
    echo ""
}

# 重启服务
restart() {
    log_info "重启所有服务..."
    pm2 restart all
    sleep 2
    pm2 status
    log_info "服务重启完成 ✅"
}

# 停止服务
stop() {
    log_info "停止所有服务..."
    pm2 stop all
    log_info "服务停止完成 ✅"
}

# 查看日志
logs() {
    log_info "查看日志（按 Ctrl+C 退出）..."
    pm2 logs
}

# 清理服务
cleanup() {
    log_info "清理 PM2 进程..."
    pm2 delete all
    log_info "清理完成 ✅"
}

# 显示帮助
show_help() {
    echo "CKAnim 部署脚本"
    echo ""
    echo "使用方法:"
    echo "  ./deploy.sh              # 完整部署（构建 + 启动）"
    echo "  ./deploy.sh build        # 仅构建"
    echo "  ./deploy.sh start        # 仅启动"
    echo "  ./deploy.sh restart      # 重启所有服务"
    echo "  ./deploy.sh stop         # 停止所有服务"
    echo "  ./deploy.sh logs         # 查看日志"
    echo "  ./deploy.sh cleanup      # 清理 PM2 进程"
    echo "  ./deploy.sh help         # 显示帮助"
    echo ""
}

# 主函数
main() {
    case "${1:-deploy}" in
        build)
            check_dependencies
            install_dependencies
            build
            setup_logs
            ;;
        start)
            check_dependencies
            setup_logs
            start
            ;;
        restart)
            restart
            ;;
        stop)
            stop
            ;;
        logs)
            logs
            ;;
        cleanup)
            cleanup
            ;;
        deploy|"")
            check_dependencies
            install_dependencies
            build
            setup_logs
            start
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令：$1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
