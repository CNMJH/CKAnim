# 📤 文件上传说明 - 安全部署

**文件已准备好**: `/tmp/ckanim-frontend-only.tar.gz` (约 100KB)

**内容**: 仅管理后台前端文件 (admin/dist/)

---

## 🚀 上传方法（任选一种）

### 方法 1: 使用宝塔面板（最简单）

1. 登录宝塔面板
2. 进入文件管理
3. 导航到 `/tmp/` 目录
4. 点击"上传"按钮
5. 选择本地文件：`/tmp/ckanim-frontend-only.tar.gz`
6. 等待上传完成

### 方法 2: 使用 FTP 工具

**FileZilla 操作步骤**:
1. 主机：`39.102.115.79`
2. 用户名：`root`
3. 密码：你的服务器密码
4. 端口：`22`
5. 连接后，本地找到 `/tmp/ckanim-frontend-only.tar.gz`
6. 远程目录：`/tmp/`
7. 拖拽上传

### 方法 3: 使用 scp 命令

```bash
# 如果你有 SSH 密钥或知道密码
scp /tmp/ckanim-frontend-only.tar.gz root@39.102.115.79:/tmp/
```

---

## 📋 上传后验证

上传完成后，在服务器上检查：

```bash
ssh root@39.102.115.79

# 检查文件是否存在
ls -lh /tmp/ckanim-frontend-only.tar.gz

# 应该显示约 100KB 大小
# -rw-r--r-- 1 root root 100K 3 月 24 日 20:00 /tmp/ckanim-frontend-only.tar.gz
```

---

## 🛡️ 安全部署步骤

**确认文件上传成功后执行**:

```bash
# 1. 进入网站目录
cd /var/www/ckanim

# 2. 备份当前前端（重要！）
cp -r admin/dist admin/dist.backup.$(date +%Y%m%d_%H%M%S)

# 3. 停止管理后台
pm2 stop ckanim-admin

# 4. 更新前端
rm -rf admin/dist
tar -xzf /tmp/ckanim-frontend-only.tar.gz -C admin/

# 5. 重启服务
pm2 start ckanim-admin --update-env

# 6. 查看状态
pm2 status
```

---

## ✅ 测试验证

**使用现有管理员账号登录**:
```
URL: http://39.102.115.79:3003
账号：admin (你的现有账号)
密码：你的密码
```

**检查**:
- ✅ 能正常登录
- ✅ 界面正常显示
- ✅ 所有功能可用
- ✅ 数据库数据完整

---

## 🔄 快速回滚（如有问题）

```bash
# 停止服务
pm2 stop ckanim-admin

# 恢复备份
cd /var/www/ckanim
rm -rf admin/dist
cp -r admin/dist.backup.* admin/dist

# 重启
pm2 start ckanim-admin --update-env
```

---

## 📞 需要帮助？

如果上传或部署过程中有任何问题，随时告诉我！

**文件位置**: `/tmp/ckanim-frontend-only.tar.gz`  
**大小**: 约 100KB  
**内容**: 仅前端静态文件，不影响数据库
