#!/bin/bash
# CKAnim 数据库备份脚本
# 用法：./backup-db.sh [备份目录]

BACKUP_DIR="${1:-/var/www/ckanim/backups}"
DB_PATH="/var/www/ckanim/server/prisma/dev.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 备份数据库
echo "📦 备份数据库..."
cp "$DB_PATH" "$BACKUP_DIR/dev.db.backup.${TIMESTAMP}"

if [ $? -eq 0 ]; then
    echo "✅ 备份成功：$BACKUP_DIR/dev.db.backup.${TIMESTAMP}"
    
    # 删除 7 天前的旧备份
    echo "🧹 清理 ${RETENTION_DAYS} 天前的旧备份..."
    find "$BACKUP_DIR" -name "dev.db.backup.*" -mtime +${RETENTION_DAYS} -delete
    
    # 显示备份列表
    echo ""
    echo "📋 当前备份："
    ls -lh "$BACKUP_DIR"/*.backup.* 2>/dev/null | tail -10
else
    echo "❌ 备份失败！"
    exit 1
fi
