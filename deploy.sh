#!/bin/bash

# CKAnim 一键部署脚本 - 生产环境版本 v2
# 使用方法：curl -sSL https://raw.githubusercontent.com/CNMJH/CKAnim/main/deploy.sh | bash

echo "=========================================="
echo "  CKAnim 一键部署脚本 v2"
echo "  服务器：39.102.115.79"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 询问用户输入七牛云配置
echo -e "${YELLOW}请先准备七牛云配置（如果没有，可以按回车跳过，稍后手动配置）${NC}"
echo ""
read -p "七牛云 AccessKey: " QINIU_ACCESS_KEY
read -p "七牛云 SecretKey: " QINIU_SECRET_KEY
read -p "七牛云储存空间名称: " QINIU_BUCKET
read -p "七牛云域名 (如 xxx.bkt.clouddn.com): " QINIU_DOMAIN
echo ""
echo -e "${YELLOW}七牛云区域选择:${NC}"
echo "  1) 华东/华北 (zone_z0) - 推荐，离北京近"
echo "  2) 华南 (zone_z2)"
read -p "请选择 (1 或 2，默认 1): " QINIU_ZONE_CHOICE

if [ "$QINIU_ZONE_CHOICE" = "2" ]; then
    QINIU_ZONE="zone_z2"
else
    QINIU_ZONE="zone_z0"
fi

echo ""
echo -e "${GREEN}开始部署，请稍候...${NC}"
echo ""

# 生成随机 JWT_SECRET
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "ckanim-$(date +%s)-$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)")

# 1. 更新系统
echo "[1/12] 更新系统..."
yum update -y > /dev/null 2>&1
echo -e "${GREEN}✓${NC} 系统更新完成"

# 2. 安装 Node.js
echo "[2/12] 安装 Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
yum install -y nodejs > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Node.js 安装完成 (版本：$(node -v))"

# 3. 安装 Git
echo "[3/12] 安装 Git..."
yum install -y git > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Git 安装完成 (版本：$(git --version | cut -d' ' -f3))"

# 4. 安装 SQLite
echo "[4/12] 安装 SQLite..."
yum install -y sqlite > /dev/null 2>&1
echo -e "${GREEN}✓${NC} SQLite 安装完成"

# 5. 安装 PM2
echo "[5/12] 安装 PM2..."
npm install -g pm2 > /dev/null 2>&1
echo -e "${GREEN}✓${NC} PM2 安装完成 (版本：$(pm2 -v))"

# 6. 下载代码
echo "[6/12] 下载网站代码..."
mkdir -p /var/www/ckanim
cd /var/www/ckanim
git clone https://github.com/CNMJH/CKAnim.git . > /dev/null 2>&1
echo -e "${GREEN}✓${NC} 代码下载完成"

# 7. 创建配置文件
echo "[7/12] 创建配置文件..."
cat > .env.production << EOF
# JWT 配置
JWT_SECRET="$JWT_SECRET"
JWT_EXPIRES_IN="7d"

# 七牛云配置
QINIU_ACCESS_KEY="$QINIU_ACCESS_KEY"
QINIU_SECRET_KEY="$QINIU_SECRET_KEY"
QINIU_BUCKET="$QINIU_BUCKET"
QINIU_DOMAIN="$QINIU_DOMAIN"
QINIU_PREFIX="ckanim/"
QINIU_ZONE="$QINIU_ZONE"

# 数据库配置 (SQLite)
DATABASE_URL="file:./server/prisma/dev.db"

# 服务器配置
PORT=3002
NODE_ENV=production

# 前台配置
FRONTEND_PORT=5173
FRONTEND_HOST=0.0.0.0

# 后台配置
ADMIN_PORT=3003
ADMIN_HOST=0.0.0.0

# 后端配置
SERVER_PORT=3002
SERVER_HOST=0.0.0.0
EOF
echo -e "${GREEN}✓${NC} 配置文件创建完成"

# 8. 安装依赖
echo "[8/12] 安装依赖（这可能需要 5-10 分钟）..."
echo "   正在安装主项目依赖..."
npm install --silent 2>&1 | grep -E "added|removed|changed" || true
echo "   正在安装管理后台依赖..."
cd admin && npm install --silent 2>&1 | grep -E "added|removed|changed" || true
echo "   正在安装后端依赖..."
cd ../server && npm install --silent 2>&1 | grep -E "added|removed|changed" || true
cd ..
echo -e "${GREEN}✓${NC} 依赖安装完成"

# 9. 初始化数据库
echo "[9/12] 初始化数据库..."
cd server
npx prisma migrate dev --name init > /dev/null 2>&1
cd ..
echo -e "${GREEN}✓${NC} 数据库初始化完成"

# 10. 构建生产版本
echo "[10/12] 构建生产版本（这可能需要 3-5 分钟）..."
echo "   正在构建前台网站..."
npm run build > /dev/null 2>&1
echo "   正在构建管理后台..."
cd admin && npm run build > /dev/null 2>&1
cd ..
echo -e "${GREEN}✓${NC} 生产版本构建完成"

# 11. 创建管理员账号
echo "[11/12] 创建管理员账号..."
cd server
# 检查是否有创建管理员脚本
if [ -f "src/scripts/create-admin.ts" ]; then
    npx tsx src/scripts/create-admin.ts > /dev/null 2>&1
    echo -e "${GREEN}✓${NC} 管理员账号创建完成"
else
    echo -e "${YELLOW}⚠${NC} 管理员创建脚本不存在，稍后手动创建"
fi
cd ..

# 12. 启动服务
echo "[12/12] 启动服务..."
pm2 start ecosystem.config.js > /dev/null 2>&1
pm2 save > /dev/null 2>&1
# 配置开机自启（仅当不是第一次运行时）
pm2 startup > /dev/null 2>&1 || true
echo -e "${GREEN}✓${NC} 服务启动完成"

# 显示服务状态
echo ""
echo -e "${GREEN}=========================================="
echo "  部署完成！🎉"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}⚠️  重要：请在阿里云控制台开放以下端口：${NC}"
echo "   1. 登录 https://console.aliyun.com"
echo "   2. 云服务器 ECS → 安全组"
echo "   3. 添加入方向规则："
echo "      - 端口 5173（前台网站）"
echo "      - 端口 3002（后端 API）"
echo "      - 端口 3003（管理后台）"
echo "      - 授权对象：0.0.0.0/0"
echo ""
echo -e "${GREEN}📌 访问地址：${NC}"
echo "   前台网站：http://39.102.115.79:5173"
echo "   管理后台：http://39.102.115.79:3003"
echo ""
echo -e "${GREEN}🔐 默认管理员账号：${NC}"
echo "   用户名：admin"
echo "   密码：admin123"
echo ""
echo -e "${GREEN}📊 常用命令：${NC}"
echo "   pm2 status        # 查看服务状态"
echo "   pm2 logs          # 查看日志"
echo "   pm2 restart all   # 重启所有服务"
echo "   pm2 stop all      # 停止所有服务"
echo ""
echo -e "${YELLOW}⚠️  如果管理员账号无法登录，请执行：${NC}"
echo "   cd /var/www/ckanim/server"
echo "   npx tsx src/scripts/create-admin.ts"
echo ""
echo "=========================================="
