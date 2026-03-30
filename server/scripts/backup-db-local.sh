#!/bin/bash
# CKAnim 本地数据库定时备份脚本
# 用法：./backup-db-local.sh [备份目录]

# 本地路径配置
BACKUP_DIR="${1:-/home/tenbox/CKAnim/server/backups}"
DB_PATH="/home/tenbox/CKAnim/server/prisma/dev.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 备份数据库
echo "📦 备份数据库..."
cp "$DB_PATH" "$BACKUP_DIR/dev.db.backup.${TIMESTAMP}"

if [ $? -eq 0 ]; then
    echo "✅ 备份成功：$BACKUP_DIR/dev.db.backup.${TIMESTAMP}"
    
    # 显示备份文件大小
    BACKUP_SIZE=$(ls -lh "$BACKUP_DIR/dev.db.backup.${TIMESTAMP}" | awk '{print $5}')
    echo "📊 备份大小：$BACKUP_SIZE"
    
    # 删除 7 天前的旧备份
    echo "🧹 清理 ${RETENTION_DAYS} 天前的旧备份..."
    find "$BACKUP_DIR" -name "dev.db.backup.*" -mtime +${RETENTION_DAYS} -delete
    
    # 显示当前备份列表（最近 5 个）
    echo ""
    echo "📋 最近 5 个备份："
    ls -lht "$BACKUP_DIR"/dev.db.backup.* 2>/dev/null | head -5
else
    echo "❌ 备份失败！"
    exit 1
fi
