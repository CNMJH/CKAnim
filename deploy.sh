#!/bin/bash

# CKAnim 一键部署脚本 - 阿里云专用
# 使用方法：复制整条命令粘贴到服务器终端执行
# curl -sSL https://raw.githubusercontent.com/CNMJH/CKAnim/main/deploy.sh | bash

echo "=========================================="
echo "  CKAnim 一键部署脚本"
echo "  服务器：39.102.115.79"
echo "=========================================="
echo ""

# 询问用户输入七牛云配置
echo "请先准备七牛云配置（如果没有，先跳过后面再配置）："
echo ""
read -p "七牛云 AccessKey: " QINIU_ACCESS_KEY
read -p "七牛云 SecretKey: " QINIU_SECRET_KEY
read -p "七牛云储存空间名称: " QINIU_BUCKET
read -p "七牛云域名: " QINIU_DOMAIN
read -p "七牛云区域 (z0=华东/华北, z2=华南): " QINIU_ZONE

echo ""
echo "正在部署，请稍候..."
echo ""

# 1. 更新系统
echo "[1/10] 更新系统..."
yum update -y > /dev/null 2>&1
echo "✓ 系统更新完成"

# 2. 安装 Node.js
echo "[2/10] 安装 Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
yum install -y nodejs > /dev/null 2>&1
echo "✓ Node.js 安装完成 (版本：$(node -v))"

# 3. 安装 Git
echo "[3/10] 安装 Git..."
yum install -y git > /dev/null 2>&1
echo "✓ Git 安装完成 (版本：$(git --version | cut -d' ' -f3))"

# 4. 安装 SQLite
echo "[4/10] 安装 SQLite..."
yum install -y sqlite > /dev/null 2>&1
echo "✓ SQLite 安装完成"

# 5. 安装 PM2
echo "[5/10] 安装 PM2..."
npm install -g pm2 > /dev/null 2>&1
echo "✓ PM2 安装完成 (版本：$(pm2 -v))"

# 6. 下载代码
echo "[6/10] 下载网站代码..."
mkdir -p /var/www/ckanim
cd /var/www/ckanim
git clone https://github.com/CNMJH/CKAnim.git . > /dev/null 2>&1
echo "✓ 代码下载完成"

# 7. 创建配置文件
echo "[7/10] 创建配置文件..."
cat > .env.production << EOF
DATABASE_URL="file:/var/www/ckanim/server/prisma/dev.db"
QINIU_ACCESS_KEY="$QINIU_ACCESS_KEY"
QINIU_SECRET_KEY="$QINIU_SECRET_KEY"
QINIU_BUCKET="$QINIU_BUCKET"
QINIU_DOMAIN="$QINIU_DOMAIN"
QINIU_ZONE="zone_$QINIU_ZONE"
FRONTEND_PORT=5173
FRONTEND_HOST=0.0.0.0
ADMIN_PORT=3003
ADMIN_HOST=0.0.0.0
SERVER_PORT=3002
SERVER_HOST=0.0.0.0
EOF
echo "✓ 配置文件创建完成"

# 8. 安装依赖
echo "[8/10] 安装依赖（这可能需要 5-10 分钟）..."
npm install --silent
cd admin && npm install --silent && cd ..
cd server && npm install --silent && cd ..
echo "✓ 依赖安装完成"

# 9. 初始化数据库
echo "[9/10] 初始化数据库..."
cd server
npx prisma migrate dev --name init > /dev/null 2>&1
cd ..
echo "✓ 数据库初始化完成"

# 10. 启动服务
echo "[10/10] 启动服务..."
pm2 start ecosystem.config.js > /dev/null 2>&1
pm2 save > /dev/null 2>&1
pm2 startup > /dev/null 2>&1
echo "✓ 服务启动完成"

# 配置阿里云安全组提示
echo ""
echo "=========================================="
echo "  部署完成！🎉"
echo "=========================================="
echo ""
echo "⚠️  重要：请在阿里云控制台开放以下端口："
echo "   1. 登录 https://console.aliyun.com"
echo "   2. 云服务器 ECS → 安全组"
echo "   3. 添加入方向规则："
echo "      - 端口 5173（前台网站）"
echo "      - 端口 3002（后端 API）"
echo "      - 端口 3003（管理后台）"
echo "      - 授权对象：0.0.0.0/0"
echo ""
echo "📌 访问地址："
echo "   前台网站：http://39.102.115.79:5173"
echo "   管理后台：http://39.102.115.79:3003"
echo ""
echo "🔐 默认管理员账号："
echo "   用户名：admin"
echo "   密码：admin123"
echo ""
echo "📊 常用命令："
echo "   pm2 status        # 查看服务状态"
echo "   pm2 logs          # 查看日志"
echo "   pm2 restart all   # 重启所有服务"
echo ""
echo "=========================================="
