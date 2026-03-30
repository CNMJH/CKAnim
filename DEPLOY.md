# 🚀 CKAnim 部署说明

## 本次更新内容

### ✨ 新功能：每日抽奖系统

#### 管理员后台
- **菜单**: 活动配置 🎰
- **功能**:
  - 抽奖活动管理（创建/编辑/删除）
  - 奖品管理（积分/道具/实物三种类型）
  - 概率验证（实时显示总概率）
  - 库存管理（实物奖品支持库存限制）
  - 抽奖记录查询

#### 用户前台
- **页面**: /lottery
- **功能**:
  - 抽奖转盘
  - 每日次数限制
  - 中奖结果展示
  - 积分自动到账
  - 抽奖记录查询

---

## 📋 部署步骤

### 方法一：SSH 自动部署（推荐）

```bash
# 1. 登录服务器
ssh root@47.243.108.190

# 2. 进入项目目录
cd /var/www/ckanim

# 3. 拉取最新代码
git pull origin main

# 4. 部署前端
cd admin
npm install
npm run build

# 5. 部署后端
cd ../server
npm install
npm run build

# 6. 重启服务
pm2 restart ckanim-server
pm2 restart ckanim-admin

# 或者使用 systemd
# systemctl restart ckanim-server
# systemctl restart ckanim-admin
```

### 方法二：使用部署脚本

```bash
# 在服务器上执行
cd /var/www/ckanim
bash deploy.sh
```

---

## 🗄️ 数据库迁移

数据库表已自动创建（通过 Prisma），包括：
- `lottery_configs` - 抽奖配置表
- `lottery_prizes` - 奖品表
- `lottery_records` - 抽奖记录表

示例数据已插入（7 个奖品，总概率 100%）：
- 10 积分 (50%)
- 50 积分 (25%)
- 100 积分 (10%)
- 额外抽奖券 (8%)
- 7 天 VIP 体验卡 (5%)
- CKAnim 定制鼠标垫 (1.5%, 库存 100)
- CKAnim 定制机械键盘 (0.5%, 库存 200)

---

## ✅ 验证清单

### 管理员后台
- [ ] 登录管理员后台
- [ ] 检查左侧菜单是否有"活动配置"🎰
- [ ] 点击进入"每日抽奖配置"
- [ ] 查看示例活动和奖品
- [ ] 测试创建新活动
- [ ] 测试添加/编辑/删除奖品
- [ ] 验证概率总和显示（应为 100%）

### 用户前台
- [ ] 访问前台抽奖页面
- [ ] 检查抽奖转盘显示
- [ ] 测试抽奖功能
- [ ] 验证每日次数限制
- [ ] 检查中奖结果弹窗
- [ ] 查看抽奖记录

---

## 🔧 故障排查

### SSH 连接超时
```bash
# 检查服务器状态
ping 47.243.108.190

# 检查 SSH 服务
ssh root@47.243.108.190 "systemctl status sshd"
```

### 前端页面不更新
```bash
# 清除浏览器缓存
# 强制刷新：Ctrl+F5 (Windows) 或 Cmd+Shift+R (Mac)

# 或者重新构建
cd /var/www/ckanim/admin
npm run build
```

### 后端 API 报错
```bash
# 查看日志
pm2 logs ckanim-server
# 或
journalctl -u ckanim-server -f

# 重启服务
pm2 restart ckanim-server
```

### 数据库问题
```bash
# 检查数据库文件
ls -la /var/www/ckanim/server/data/

# 重新同步数据库
cd /var/www/ckanim/server
npx prisma db push
```

---

## 📊 Git 提交记录

```
66c15ed fix: 修复抽奖 API 路径 - 添加/admin 前缀
ecea2dd feat: 添加每日抽奖功能 - 管理员后台活动配置页面
f2e307c fix: 恢复设置页面的会员登录按钮功能开关
```

---

## 🎯 下一步计划

1. **完善前台抽奖界面** - 转盘动画优化
2. **实物奖品兑换** - 添加收货地址管理
3. **抽奖统计** - 管理员后台数据看板
4. **活动分享** - 邀请好友增加抽奖次数

---

**部署完成后请在大王群内通知测试！** 🎉
