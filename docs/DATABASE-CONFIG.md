# 数据库配置说明

> **重要**：本文档解释 CKAnim 的数据库配置，避免路径错误导致部署失败。

---

## 📊 数据库配置概览

### SQLite 数据库文件位置

```
/var/www/ckanim/server/prisma/dev.db
```

---

## 🔍 配置方式

### 方式 1：schema.prisma 配置

**文件位置**：`/var/www/ckanim/server/prisma/schema.prisma`

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

**路径说明**：
- `file:./dev.db` = 相对于 schema.prisma 所在目录
- schema.prisma 在 `server/prisma/` 目录
- 所以数据库文件在 `server/prisma/dev.db`

---

### 方式 2：环境变量配置（优先级更高）

**文件位置**：`/var/www/ckanim/.env.production`

```bash
DATABASE_URL="file:/var/www/ckanim/server/prisma/dev.db"
```

**路径说明**：
- 使用**绝对路径**，避免混淆
- 无论在哪个目录执行命令，路径都正确

**为什么使用绝对路径？**

| 当前目录 | 相对路径配置 | 解析后的实际路径 | 结果 |
|---------|-------------|-----------------|------|
| `/var/www/ckanim` | `file:./server/prisma/dev.db` | `/var/www/ckanim/server/prisma/dev.db` | ✅ 正确 |
| `/var/www/ckanim/server` | `file:./server/prisma/dev.db` | `/var/www/ckanim/server/server/prisma/dev.db` | ❌ 错误 |
| `/var/www/ckanim` | `file:/var/www/ckanim/server/prisma/dev.db` | `/var/www/ckanim/server/prisma/dev.db` | ✅ 正确 |
| `/var/www/ckanim/server` | `file:/var/www/ckanim/server/prisma/dev.db` | `/var/www/ckanim/server/prisma/dev.db` | ✅ 正确 |

**结论**：绝对路径在任何目录都正确！

---

## ⚠️ Prisma 的行为

### 环境变量优先级

Prisma 使用数据库 URL 的优先级：

1. **最高优先级**：`DATABASE_URL` 环境变量
2. **次高优先级**：`.env` 或 `.env.production` 文件中的 `DATABASE_URL`
3. **最低优先级**：`schema.prisma` 中的 `url` 配置

**示例**：

```bash
# 如果设置了 DATABASE_URL
export DATABASE_URL="file:/var/www/ckanim/server/prisma/dev.db"

# Prisma 会使用这个值，忽略 schema.prisma 中的配置
npx prisma migrate dev
```

---

## 🚀 部署时的配置

### 正确的配置（使用绝对路径）

```bash
# .env.production
DATABASE_URL="file:/var/www/ckanim/server/prisma/dev.db"
```

**执行命令**（在任何目录都正确）：

```bash
# 在项目根目录
cd /var/www/ckanim
npx prisma migrate dev

# 在 server 目录
cd /var/www/ckanim/server
npx prisma migrate dev
```

---

### 错误的配置（使用相对路径）

```bash
# .env.production
DATABASE_URL="file:./server/prisma/dev.db"  # ❌ 错误！
```

**问题**：

```bash
# 在项目根目录 - 正确
cd /var/www/ckanim
npx prisma migrate dev
# 数据库路径：/var/www/ckanim/server/prisma/dev.db ✅

# 在 server 目录 - 错误！
cd /var/www/ckanim/server
npx prisma migrate dev
# 数据库路径：/var/www/ckanim/server/server/prisma/dev.db ❌
# Prisma 会报错：无法找到数据库文件
```

---

## 🔧 常见问题

### Q1: 部署后 Prisma 报错"无法找到数据库文件"

**错误信息**：
```
Error: P1001: Can't reach database server at `file:./server/prisma/dev.db`
```

**原因**：路径配置错误

**解决**：
```bash
# 检查 .env.production 文件
cat /var/www/ckanim/.env.production | grep DATABASE_URL

# 应该是绝对路径
DATABASE_URL="file:/var/www/ckanim/server/prisma/dev.db"

# 如果是相对路径，修改它
nano /var/www/ckanim/.env.production
```

---

### Q2: 数据库文件在哪里？

**查看数据库文件**：

```bash
ls -la /var/www/ckanim/server/prisma/dev.db
```

**成功的标志**：显示文件信息

**如果文件不存在**：
```bash
# 初始化数据库
cd /var/www/ckanim/server
npx prisma migrate dev --name init
```

---

### Q3: 如何重置数据库？

**⚠️ 警告**：这会清空所有数据！

```bash
cd /var/www/ckanim/server
npx prisma migrate reset
```

**重新创建管理员**：
```bash
npx tsx src/scripts/create-admin.ts
```

---

## 📋 检查清单

部署时检查以下配置：

- [ ] `.env.production` 文件存在
- [ ] `DATABASE_URL` 使用绝对路径
- [ ] 数据库文件存在（`server/prisma/dev.db`）
- [ ] Prisma schema 已应用（`npx prisma migrate dev`）
- [ ] 管理员账号已创建

---

## 📖 相关文档

| 文档 | 说明 |
|------|------|
| [DEPLOYMENT-MANUAL.md](./DEPLOYMENT-MANUAL.md) | 零基础部署教程 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 标准部署指南 |
| [DEPLOYMENT-FIXES.md](./DEPLOYMENT-FIXES.md) | 部署问题修正说明 |

---

**创建时间**: 2026-03-21  
**最后更新**: 2026-03-21  
**目的**：避免数据库路径配置错误
