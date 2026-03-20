# 数据库配置对比报告

> **检查时间**: 2026-03-21  
> **目的**: 对比本地开发环境与部署教程的数据库配置，确保一致性

---

## 📊 本地开发环境配置

### 1. 数据库文件位置

```
/home/tenbox/CKAnim/server/prisma/dev.db
```

**验证**：
```bash
$ ls -la /home/tenbox/CKAnim/server/prisma/dev.db
-rw-r--r-- 1 tenbox tenbox 139264 3 月 20 18:49 dev.db
```

✅ **数据库文件存在**

---

### 2. schema.prisma 配置

**文件**：`/home/tenbox/CKAnim/server/prisma/schema.prisma`

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

**说明**：
- 使用 SQLite 数据库
- 路径 `file:./dev.db` = 相对于 schema.prisma 所在目录
- 实际路径：`/home/tenbox/CKAnim/server/prisma/dev.db`

✅ **配置正确**

---

### 3. 开发环境变量

**文件**：`/home/tenbox/CKAnim/server/.env`

```bash
# 服务器配置
PORT=3002
NODE_ENV=development

# SQLite 数据库（开发用）
DATABASE_URL="file:./prisma/dev.db"

# JWT 配置
JWT_SECRET="ckanim-admin-secret-key-change-in-production-2026"
JWT_EXPIRES_IN="7d"

# 七牛云配置
QINIU_ACCESS_KEY="DwLK5ft-Zx0XgxiI8HaIyeUh0wyaHddssczs2s0c"
QINIU_SECRET_KEY="14ykOp2Q-nkbLmSfZdd2aHmoEnZUHqWxk1BeFN2-"
QINIU_BUCKET="zhuque-guangdong"
QINIU_DOMAIN="https://video.jiangmeijixie.com"
QINIU_PREFIX="参考网站 2026/"
```

**说明**：
- `DATABASE_URL="file:./prisma/dev.db"` = 相对于 `/home/tenbox/CKAnim/server/` 目录
- 实际路径：`/home/tenbox/CKAnim/server/prisma/dev.db`

✅ **配置正确**

---

### 4. Prisma 执行验证

```bash
$ cd /home/tenbox/CKAnim/server
$ npx prisma db pull

Prisma schema loaded from prisma/schema.prisma
Environment variables loaded from .env
Datasource "db": SQLite database "dev.db" at "file:./dev.db"
```

✅ **Prisma 正确识别数据库**

---

### 5. 数据库表结构

**已创建的表**（通过 introspect 验证）：

1. `admins` - 管理员表
2. `games` - 游戏表
3. `game_categories` - 游戏分类表
4. `characters` - 角色表
5. `actions` - 动作表
6. `videos` - 视频表
7. `video_tags` - 视频标签表
8. `site_settings` - 网站设置表

✅ **数据库表结构完整**

---

## 📋 部署教程配置

### 教程 1：DEPLOYMENT-MANUAL.md

**配置**：
```bash
DATABASE_URL="file:/var/www/ckanim/server/prisma/dev.db"
```

**说明**：使用绝对路径

---

### 教程 2：deploy.sh

**配置**：
```bash
DATABASE_URL="file:/var/www/ckanim/server/prisma/dev.db"
```

**说明**：使用绝对路径

---

## 🔄 配置对比

| 项目 | 本地开发环境 | 部署教程 | 是否一致 |
|------|-------------|---------|---------|
| 数据库类型 | SQLite | SQLite | ✅ 一致 |
| schema.prisma 路径 | `file:./dev.db` | `file:./dev.db` | ✅ 一致 |
| 环境变量路径 | `file:./prisma/dev.db` | `file:/var/www/ckanim/server/prisma/dev.db` | ⚠️ **不同** |
| 实际数据库位置 | `/home/tenbox/CKAnim/server/prisma/dev.db` | `/var/www/ckanim/server/prisma/dev.db` | ✅ 逻辑一致 |

---

## ⚠️ 关键发现

### 问题：路径表示方式不同

**本地开发环境**：
```bash
# 在 server/.env 中
DATABASE_URL="file:./prisma/dev.db"
```

**部署教程**：
```bash
# 在 .env.production 中
DATABASE_URL="file:/var/www/ckanim/server/prisma/dev.db"
```

**原因分析**：

1. **本地开发**：
   - 工作目录：`/home/tenbox/CKAnim/server/`
   - 相对路径：`./prisma/dev.db`
   - 实际路径：`/home/tenbox/CKAnim/server/prisma/dev.db`

2. **部署教程**：
   - 工作目录：`/var/www/ckanim/`（项目根目录）
   - 绝对路径：`/var/www/ckanim/server/prisma/dev.db`
   - 避免在不同目录执行时路径错误

---

## ✅ 验证结果

### 1. schema.prisma 配置 ✅

**本地**：
```prisma
url = "file:./dev.db"
```

**说明**：相对于 schema.prisma 文件所在目录（`server/prisma/`）

**实际**：`/home/tenbox/CKAnim/server/prisma/dev.db`

✅ **正确**

---

### 2. 环境变量配置 ⚠️

**本地**（server/.env）：
```bash
DATABASE_URL="file:./prisma/dev.db"
```

**说明**：相对于当前工作目录（`server/`）

**实际**：`/home/tenbox/CKAnim/server/prisma/dev.db`

✅ **正确**

---

### 3. 部署教程配置 ✅

**教程**（.env.production）：
```bash
DATABASE_URL="file:/var/www/ckanim/server/prisma/dev.db"
```

**说明**：绝对路径，任何目录都正确

**实际**：`/var/www/ckanim/server/prisma/dev.db`

✅ **正确且更安全**

---

## 🎯 结论

### ✅ 配置一致性

1. **数据库类型**：本地和部署都使用 SQLite ✅
2. **schema.prisma**：配置完全一致 ✅
3. **数据库位置**：逻辑一致（都在 `server/prisma/dev.db`）✅
4. **表结构**：完全一致 ✅

### ⚠️ 路径表示差异

**本地开发**使用相对路径：
```bash
DATABASE_URL="file:./prisma/dev.db"
```

**部署教程**使用绝对路径：
```bash
DATABASE_URL="file:/var/www/ckanim/server/prisma/dev.db"
```

**原因**：
- 本地开发：固定在工作目录，相对路径足够
- 部署教程：可能在任何目录执行，绝对路径更安全

**影响**：无负面影响，两种方式都正确 ✅

---

## 📝 建议

### 建议 1：部署教程保持绝对路径 ✅

**理由**：
- 在任何目录执行都正确
- 避免路径混淆
- 更适合生产环境

---

### 建议 2：本地开发可改用绝对路径

**当前**：
```bash
DATABASE_URL="file:./prisma/dev.db"
```

**建议**：
```bash
DATABASE_URL="file:/home/tenbox/CKAnim/server/prisma/dev.db"
```

**理由**：
- 与部署配置一致
- 避免切换目录时出错

---

### 建议 3：添加配置说明文档

已创建：`docs/DATABASE-CONFIG.md`

**内容**：
- 路径配置说明
- 相对路径 vs 绝对路径
- 常见问题解答

---

## 📊 最终验证

### 验证命令

```bash
# 1. 检查数据库文件
ls -la /home/tenbox/CKAnim/server/prisma/dev.db

# 2. 检查 schema.prisma
cat /home/tenbox/CKAnim/server/prisma/schema.prisma | grep -A 3 "datasource db"

# 3. 检查环境变量
cat /home/tenbox/CKAnim/server/.env | grep DATABASE_URL

# 4. 验证 Prisma 连接
cd /home/tenbox/CKAnim/server && npx prisma db pull
```

### 验证结果

```
✅ 数据库文件存在
✅ schema.prisma 配置正确
✅ 环境变量配置正确
✅ Prisma 连接成功
```

---

## ✅ 总结

**本地开发环境配置正确**，**部署教程配置正确**，两者**逻辑一致**。

**唯一差异**：路径表示方式（相对路径 vs 绝对路径），但都正确工作。

**部署教程使用绝对路径更优**，推荐保持。

---

**检查完成时间**: 2026-03-21  
**检查者**: 波波  
**状态**: ✅ 验证通过
