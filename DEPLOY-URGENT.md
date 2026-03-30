# 🚨 紧急部署指南 - 每日抽奖功能

## 当前状态

✅ **本地开发完成**
- 数据库表结构已创建
- 后端 API 已实现
- 管理员后台页面已完成
- 用户前台抽奖页面已完成
- 本地构建成功

⚠️ **服务器部署** - SSH 连接超时，需手动部署

---

## 📋 手动部署步骤

### 方案 A：完整部署（推荐）

```bash
# 1. SSH 登录服务器
ssh root@47.243.108.190

# 2. 进入项目目录
cd /var/www/ckanim

# 3. 拉取最新代码（可能需要等待）
git pull origin main

# 如果 git pull 慢，可以尝试：
# git fetch
# git reset --hard origin/main

# 4. 构建前端
cd admin
npm install
npm run build
cd ..

# 5. 构建后端
cd server
npm install
npm run build
cd ..

# 6. 重启服务
pm2 restart ckanim-server
pm2 restart ckanim-admin

# 或
# systemctl restart ckanim-server
# systemctl restart ckanim-admin
```

### 方案 B：快速部署（仅前端）

```bash
# 1. SSH 登录
ssh root@47.243.108.190

# 2. 进入项目
cd /var/www/ckanim

# 3. 拉取代码
git pull origin main

# 4. 仅构建前端（后端代码变化小）
cd admin
npm run build

# 5. 重启 Nginx（如果需要）
systemctl reload nginx
```

### 方案 C：最小化部署（仅数据库 + 后端）

```bash
# 1. SSH 登录
ssh root@47.243.108.190

# 2. 进入项目
cd /var/www/ckanim

# 3. 拉取代码
git pull origin main

# 4. 同步数据库
cd server
npx prisma db push

# 5. 构建后端
npm run build

# 6. 重启服务
pm2 restart ckanim-server
```

---

## 🔍 验证部署

### 1. 检查管理员后台

```bash
# 访问：http://47.243.108.190/admin
# 1. 登录管理员账号
# 2. 检查左侧菜单是否有 "活动配置"🎰
# 3. 点击进入查看示例活动
```

### 2. 检查用户前台

```bash
# 访问：http://47.243.108.190/lottery
# 1. 检查抽奖转盘显示
# 2. 测试抽奖功能
# 3. 查看中奖弹窗
```

### 3. 检查数据库

```bash
# SSH 登录后执行
cd /var/www/ckanim/server
sqlite3 data/prod.db "SELECT * FROM lottery_configs;"
sqlite3 data/prod.db "SELECT * FROM lottery_prizes;"
```

---

## 🐛 故障排查

### SSH 连接慢/超时

```bash
# 1. 检查服务器状态
ping 47.243.108.190

# 2. 检查 SSH 服务
ssh root@47.243.108.190 "systemctl status sshd"

# 3. 检查服务器负载
ssh root@47.243.108.190 "uptime"
ssh root@47.243.108.190 "free -h"
ssh root@47.243.108.190 "df -h"
```

### Git 拉取慢

```bash
# 使用浅克隆
cd /var/www/ckanim
git fetch --depth=1 origin main
git reset --hard origin/main

# 或配置 git 加速
git config --global http.postBuffer 524288000
git config --global https.postBuffer 524288000
```

### 构建失败

```bash
# 清理缓存
cd /var/www/ckanim/admin
rm -rf node_modules package-lock.json
npm install
npm run build

# 或后端
cd /var/www/ckanim/server
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 服务无法启动

```bash
# 查看 PM2 日志
pm2 logs ckanim-server --lines 50
pm2 logs ckanim-admin --lines 50

# 查看进程状态
pm2 status

# 重启服务
pm2 restart all
pm2 save
```

---

## 📦 本次更新内容

### 新增文件
```
server/src/routes/lottery.ts          # 后端抽奖 API
admin/src/pages/ActivityManagement.jsx  # 管理员后台主页面
admin/src/pages/DailyLottery.jsx        # 每日抽奖配置页
admin/src/pages/Placeholder.jsx         # 待定页面
admin/src/pages/ActivityManagement.css  # 样式
src/pages/Lottery.jsx                   # 前台抽奖页面
src/pages/Lottery.css                   # 前台样式
```

### 修改文件
```
server/prisma/schema.prisma    # 添加抽奖表
server/src/index.ts            # 注册抽奖路由
admin/src/App.jsx              # 添加活动配置路由
admin/src/components/Layout.jsx # 添加活动配置菜单
admin/src/lib/services.js      # 添加 lotteryAPI
src/lib/api.js                 # 添加前台 lotteryAPI
```

### 数据库表
```sql
lottery_configs     -- 抽奖配置
lottery_prizes      -- 奖品
lottery_records     -- 抽奖记录
```

---

## 📞 需要帮助？

如果部署遇到问题，请提供：
1. SSH 执行的命令
2. 完整的错误信息
3. 服务器状态（uptime, free -h, df -h）

---

**部署完成后在大王群内通知测试！** 🎉
