# CKAnim 数据库自动备份配置

## ✅ 配置完成时间
**2026-03-27 00:16**

---

## 📋 配置详情

### 备份频率
**每小时一次**（每小时的第 0 分钟执行）

### Cron 任务
```bash
# 查看当前 cron 任务
crontab -l

# 输出：
# CKAnim 数据库每小时自动备份
0 * * * * /home/tenbox/CKAnim/server/scripts/backup-db-local.sh >> /home/tenbox/CKAnim/server/logs/backup.log 2>&1
```

### 备份脚本
- **路径**: `/home/tenbox/CKAnim/server/scripts/backup-db-local.sh`
- **权限**: 可执行 (chmod +x)
- **功能**:
  - 复制数据库到备份目录
  - 显示备份大小
  - 自动清理 7 天前的旧备份
  - 显示最近 5 个备份

### 备份存储
- **目录**: `/home/tenbox/CKAnim/server/backups/`
- **命名格式**: `dev.db.backup.YYYYMMDD_HHMMSS`
- **保留策略**: 7 天
- **当前大小**: ~280KB

### 日志文件
- **路径**: `/home/tenbox/CKAnim/server/logs/backup.log`
- **格式**: 追加模式（保留所有历史日志）

---

## 🔧 管理命令

### 查看备份列表
```bash
ls -lht /home/tenbox/CKAnim/server/backups/
```

### 手动备份
```bash
/home/tenbox/CKAnim/server/scripts/backup-db-local.sh
```

### 查看备份日志
```bash
tail -50 /home/tenbox/CKAnim/server/logs/backup.log
```

### 查看 cron 任务
```bash
crontab -l
```

### 编辑 cron 任务
```bash
crontab -e
```

### 删除 cron 任务
```bash
crontab -r
```

---

## 📊 备份恢复流程

### 从备份恢复
```bash
# 1. 查看可用备份
ls -lht /home/tenbox/CKAnim/server/backups/

# 2. 停止服务（可选，但推荐）
pm2 stop ckanim-server

# 3. 恢复备份
cp /home/tenbox/CKAnim/server/backups/dev.db.backup.20260327_001642 \
   /home/tenbox/CKAnim/server/prisma/dev.db

# 4. 重启服务
pm2 restart ckanim-server

# 5. 验证数据
sqlite3 /home/tenbox/CKAnim/server/prisma/dev.db "SELECT COUNT(*) FROM videos;"
```

---

## 🕐 Cron 时间格式说明

```
# ┌── 分钟 (0-59)
# │ ┌── 小时 (0-23)
# │ │ ┌── 日期 (1-31)
# │ │ │ ┌── 月份 (1-12)
# │ │ │ │ ┌── 星期 (0-7, 0 和 7 都是周日)
# │ │ │ │ │
# * * * * * 命令
```

### 常用示例

| 频率 | Cron 表达式 | 说明 |
|------|-----------|------|
| 每小时 | `0 * * * *` | 每小时第 0 分钟 |
| 每 30 分钟 | `*/30 * * * *` | 每 30 分钟 |
| 每天凌晨 3 点 | `0 3 * * *` | 每天 03:00 |
| 每周一上午 9 点 | `0 9 * * 1` | 周一 09:00 |
| 每天 6 次 | `0 0,4,8,12,16,20 * * *` | 每 4 小时 |

---

## ⚠️ 注意事项

### 1. 磁盘空间监控
定期检查备份目录大小：
```bash
du -sh /home/tenbox/CKAnim/server/backups/
```

### 2. 备份验证
定期测试备份恢复：
```bash
# 随机选一个备份，恢复到测试数据库
cp /home/tenbox/CKAnim/server/backups/dev.db.backup.XXXX \
   /home/tenbox/CKAnim/server/prisma/dev.db.test

# 验证数据完整性
sqlite3 /home/tenbox/CKAnim/server/prisma/dev.db.test \
  "SELECT COUNT(*) FROM videos;"
```

### 3. 日志轮转
如果日志文件太大，可以设置日志轮转：
```bash
# 创建 logrotate 配置
sudo nano /etc/logrotate.d/ckanim-backup
```

### 4. 备份保留策略
当前配置保留 7 天，如需修改：
```bash
# 编辑备份脚本
nano /home/tenbox/CKAnim/server/scripts/backup-db-local.sh

# 修改 RETENTION_DAYS 变量
RETENTION_DAYS=30  # 改为 30 天
```

---

## 📈 备份监控建议

### 添加备份告警
可以在备份脚本中添加邮件或钉钉通知：

```bash
# 备份失败时发送通知
if [ $? -ne 0 ]; then
    curl -X POST "https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"msgtype":"text","text":{"content":"CKAnim 数据库备份失败！"}}'
fi
```

### 备份健康检查
每天检查备份是否正常：
```bash
# 检查最近 24 小时是否有备份
find /home/tenbox/CKAnim/server/backups/ -name "dev.db.backup.*" -mtime -1 | wc -l
# 应该 >= 24（每小时一个）
```

---

## 🎯 下一步优化

1. **异地备份** - 将备份同步到云存储（七牛云、S3 等）
2. **增量备份** - 使用 rsync 或专业工具减少备份大小
3. **备份加密** - 使用 gpg 加密敏感数据
4. **监控告警** - 集成到监控系统（Prometheus、Grafana 等）

---

**配置人**: 波波  
**最后更新**: 2026-03-27 00:16
