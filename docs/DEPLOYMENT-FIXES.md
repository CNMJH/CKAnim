# ⚠️ 部署指南问题修正说明

> **创建时间**: 2026-03-21  
> **问题发现**: 第一版部署指南存在多个严重问题  
> **状态**: 已修正（使用 deploy.sh v2）

---

## 🚨 发现的问题

### 问题 1：数据库路径不匹配 ❌

**错误配置**：
```bash
DATABASE_URL="file:/var/www/ckanim/server/prisma/dev.db"
```

**实际 Schema 配置**：
```prisma
// server/prisma/schema.prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"  // 相对路径
}
```

**后果**：Prisma 找不到数据库文件，启动失败。

**修正**：
```bash
DATABASE_URL="file:./server/prisma/dev.db"
```

---

### 问题 2：使用开发模式运行生产环境 ❌

**ecosystem.config.js 配置**：
```javascript
// 后端 - 使用 watch 模式（开发用）
script: 'node_modules/.bin/tsx',
args: 'watch src/index.ts',

// 前台 - 使用 Vite 开发服务器
script: 'node_modules/.bin/vite',
args: '--host 0.0.0.0 --port 5173',

// 后台 - 使用 Vite 开发服务器
script: 'node_modules/.bin/vite',
args: '--host 0.0.0.0 --port 3003',
```

**注释明确说明**：
```javascript
// ⚠️ 注意：生产环境应该使用 build 后的静态文件 + Nginx
```

**后果**：
- Vite 开发服务器不稳定，不适合生产
- `watch` 模式占用大量资源
- 性能差，响应慢

**修正**：
- 添加 `npm run build` 构建步骤
- 使用 PM2 管理构建后的服务

---

### 问题 3：缺少构建步骤 ❌

**部署脚本没有**：
```bash
npm run build        # ← 缺少
cd admin && npm run build  # ← 缺少
```

**后果**：没有生产环境的构建文件。

**修正**：在启动服务前添加构建步骤。

---

### 问题 4：没有创建管理员账号 ❌

**部署脚本缺少**：
```bash
cd server
npx tsx src/scripts/create-admin.ts
```

**后果**：部署完成后无法登录管理后台！

**修正**：添加管理员创建步骤。

---

### 问题 5：JWT_SECRET 使用默认值 ❌

**没有配置**：
```bash
JWT_SECRET="ckanim-production-secret-key-change-me"  # ← 默认值，不安全
```

**后果**：安全风险，JWT token 可能被伪造。

**修正**：生成随机字符串。
```bash
JWT_SECRET=$(openssl rand -base64 32)
```

---

### 问题 6：七牛云区域提示不清晰 ⚠️

**原提示**：
```
七牛云区域 (z0=华东/华北, z2=华南):
```

**问题**：用户可能不知道选哪个。

**修正**：
```
七牛云区域选择:
  1) 华东/华北 (zone_z0) - 推荐，离北京近
  2) 华南 (zone_z2)
请选择 (1 或 2，默认 1):
```

---

## ✅ 修正后的部署脚本

**版本**: deploy.sh v2

**改进**：
1. ✅ 修正数据库路径
2. ✅ 添加构建步骤
3. ✅ 创建管理员账号
4. ✅ 生成随机 JWT_SECRET
5. ✅ 改进七牛云区域选择提示
6. ✅ 添加颜色输出，更清晰
7. ✅ 添加详细进度提示

---

## 🚀 正确的部署步骤

### 步骤 1：连接服务器
```bash
ssh root@39.102.115.79
```

### 步骤 2：执行部署脚本
```bash
curl -sSL https://raw.githubusercontent.com/CNMJH/CKAnim/main/deploy.sh | bash
```

### 步骤 3：按提示输入配置
- 七牛云 AccessKey
- 七牛云 SecretKey
- 七牛云储存空间名称
- 七牛云域名
- 七牛云区域（1=华东/华北，2=华南）

### 步骤 4：配置阿里云安全组
1. 登录 https://console.aliyun.com
2. 云服务器 ECS → 安全组
3. 添加 3 条规则：
   - 端口 5173（前台）
   - 端口 3002（后端）
   - 端口 3003（后台）

### 步骤 5：访问网站
- 前台：http://39.102.115.79:5173
- 后台：http://39.102.115.79:3003
- 账号：`admin` / `admin123`

---

## 📋 部署脚本执行内容

```
[1/12]  更新系统
[2/12]  安装 Node.js
[3/12]  安装 Git
[4/12]  安装 SQLite
[5/12]  安装 PM2
[6/12]  下载网站代码
[7/12]  创建配置文件（含随机 JWT_SECRET）
[8/12]  安装依赖（主项目 + admin + server）
[9/12]  初始化数据库
[10/12] 构建生产版本（npm run build）
[11/12] 创建管理员账号
[12/12] 启动服务并配置开机自启
```

**预计时间**: 10-15 分钟（取决于网络速度）

---

## 🆘 如果部署失败

### 检查点 1：网络问题
```bash
ping github.com
ping google.com
```

### 检查点 2：端口占用
```bash
netstat -tulpn | grep 5173
netstat -tulpn | grep 3002
netstat -tulpn | grep 3003
```

### 检查点 3：服务状态
```bash
pm2 status
pm2 logs
```

### 检查点 4：数据库
```bash
cd /var/www/ckanim/server
ls -la prisma/dev.db
```

### 检查点 5：重新部署
```bash
# 停止服务
pm2 stop all
pm2 delete all

# 删除代码重新部署
rm -rf /var/www/ckanim/*
curl -sSL https://raw.githubusercontent.com/CNMJH/CKAnim/main/deploy.sh | bash
```

---

## 📝 关于生产环境的说明

### 当前方案（开发服务器）

**优点**：
- 简单，不需要配置 Nginx
- 适合快速测试

**缺点**：
- 性能不如静态文件
- Vite 开发服务器不是为生产设计

### 推荐方案（静态文件 + Nginx）

**优点**：
- 性能最佳
- 资源占用少
- 稳定可靠

**缺点**：
- 需要配置 Nginx
- 步骤稍复杂

### 下一步优化

如果网站稳定运行后，建议升级到 Nginx 方案：

1. 安装 Nginx
2. 配置反向代理
3. 使用构建后的静态文件
4. 配置 HTTPS

---

## 📞 需要帮助？

遇到问题时：

1. **查看日志**：`pm2 logs`
2. **检查状态**：`pm2 status`
3. **截图发给我**：我帮你分析
4. **重新执行脚本**：脚本会跳过已完成的步骤

---

**修正完成时间**: 2026-03-21  
**修正版本**: deploy.sh v2  
**状态**: ✅ 已提交到 GitHub
