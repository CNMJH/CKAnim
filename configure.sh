#!/bin/bash

# CKAnim 自动配置脚本
# 使用方法：bash configure.sh

echo "=========================================="
echo "  CKAnim 自动配置脚本"
echo "=========================================="
echo ""

# 生成 JWT_SECRET
echo "1. 生成 JWT_SECRET..."
JWT_SECRET=$(openssl rand -base64 32)
echo "   已生成：$JWT_SECRET"
echo ""

# 输入七牛云配置
echo "2. 请输入七牛云配置："
echo ""

read -p "   AccessKey: " QINIU_ACCESS_KEY
read -p "   SecretKey: " QINIU_SECRET_KEY
read -p "   Bucket (储存空间名称): " QINIU_BUCKET
read -p "   Domain (域名，带 https://): " QINIU_DOMAIN
read -p "   Prefix (路径前缀，如 参考网站 2026/): " QINIU_PREFIX

echo ""
echo "3. 正在修改配置文件..."

# 使用 sed 替换配置
sed -i "s/JWT_SECRET: '替换成你生成的随机字符串'/JWT_SECRET: '$JWT_SECRET'/" ecosystem.config.js
sed -i "s/QINIU_ACCESS_KEY: '替换成你的 AccessKey'/QINIU_ACCESS_KEY: '$QINIU_ACCESS_KEY'/" ecosystem.config.js
sed -i "s/QINIU_SECRET_KEY: '替换成你的 SecretKey'/QINIU_SECRET_KEY: '$QINIU_SECRET_KEY'/" ecosystem.config.js
sed -i "s/QINIU_BUCKET: '替换成你的储存空间名称'/QINIU_BUCKET: '$QINIU_BUCKET'/" ecosystem.config.js
sed -i "s|QINIU_DOMAIN: '替换成你的七牛云域名（带 https://）'|QINIU_DOMAIN: '$QINIU_DOMAIN'|" ecosystem.config.js

echo ""
echo "=========================================="
echo "  ✅ 配置完成！"
echo "=========================================="
echo ""
echo "你的配置："
echo "  JWT_SECRET: $JWT_SECRET"
echo "  QINIU_ACCESS_KEY: $QINIU_ACCESS_KEY"
echo "  QINIU_SECRET_KEY: $QINIU_SECRET_KEY"
echo "  QINIU_BUCKET: $QINIU_BUCKET"
echo "  QINIU_DOMAIN: $QINIU_DOMAIN"
echo "  QINIU_PREFIX: $QINIU_PREFIX"
echo ""
echo "下一步："
echo "  1. 安装依赖：npm install"
echo "  2. 初始化数据库：cd server && npx prisma migrate dev --name init && cd .."
echo "  3. 创建管理员：cd server && npx tsx src/scripts/create-admin.ts && cd .."
echo "  4. 构建项目：npm run build"
echo "  5. 启动服务：pm2 start ecosystem.config.js"
echo ""
