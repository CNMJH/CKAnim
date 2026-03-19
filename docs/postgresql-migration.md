# PostgreSQL 数据库迁移指南

本文档介绍如何从 SQLite 迁移到 PostgreSQL。

---

## 📋 为什么要迁移到 PostgreSQL？

**SQLite 的局限性**:
- ❌ 并发写入受限（文件锁）
- ❌ 不支持多用户同时写入
- ❌ 无备份/恢复机制
- ❌ 性能受限（大数据量）

**PostgreSQL 的优势**:
- ✅ 支持高并发
- ✅ 完整的 ACID 事务
- ✅ 强大的备份/恢复
- ✅ 更好的性能
- ✅ 生产环境标准

---

## 🚀 迁移步骤

### 步骤 1: 准备 PostgreSQL 数据库

**选项 A: 阿里云 RDS（推荐）**
1. 登录阿里云控制台
2. 创建 RDS PostgreSQL 实例
3. 选择配置：2 核 4G+（根据需求）
4. 设置白名单（允许服务器 IP 访问）
5. 记录连接信息：
   - Host: `xxx.rds.aliyuncs.com`
   - Port: `5432`
   - Database: `ckanim`
   - Username: `ckanim`
   - Password: `your-password`

**选项 B: 自建 PostgreSQL**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# 创建数据库
sudo -u postgres psql
CREATE DATABASE ckanim;
CREATE USER ckanim WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE ckanim TO ckanim;
\q
```

---

### 步骤 2: 配置环境变量

编辑 `server/.env.production`:
```env
# 替换为实际的 PostgreSQL 连接字符串
DATABASE_URL="postgresql://ckanim:your-password@host:5432/ckanim?schema=public"

# 其他配置保持不变
JWT_SECRET="your-secret-key"
QINIU_ACCESS_KEY="..."
QINIU_SECRET_KEY="..."
```

---

### 步骤 3: 切换 Prisma Schema

**方法 A: 使用 PostgreSQL 专用 Schema**
```bash
cd server

# 备份当前 SQLite schema
cp prisma/schema.prisma prisma/schema.sqlite.prisma

# 使用 PostgreSQL schema
cp prisma/schema.postgresql.prisma prisma/schema.prisma
```

**方法 B: 手动修改**
编辑 `server/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"  // 从 sqlite 改为 postgresql
  url      = env("DATABASE_URL")
}
```

---

### 步骤 4: 生成 Prisma 客户端

```bash
cd server
npx prisma generate
```

---

### 步骤 5: 运行数据库迁移

```bash
cd server

# 创建迁移
npx prisma migrate dev --name init

# 或者生产环境（不创建迁移文件，直接应用）
npx prisma migrate deploy
```

---

### 步骤 6: 创建管理员账户

```bash
cd server

# 运行创建管理员脚本
npx tsx prisma/create-admin.ts

# 或者手动创建（使用 bcrypt 加密密码）
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const hash = await bcrypt.hash('admin123', 10);
await prisma.admin.create({
  data: { username: 'admin', password: hash }
});
"
```

---

### 步骤 7: 导入现有数据（可选）

如果需要从 SQLite 迁移数据：

```bash
# 导出 SQLite 数据
cd server
npx prisma db seed -- --format json > data-export.json

# 导入到 PostgreSQL
# 编写自定义脚本导入 JSON 数据
```

或者使用第三方工具：
- [pgloader](https://pgloader.io/) - 自动迁移工具
- [sqlite-to-postgres](https://github.com/dimitri/pgloader) - Python 脚本

---

## 🔍 验证迁移

### 1. 测试数据库连接

```bash
cd server
npx prisma db pull
```

如果成功，说明连接正常。

### 2. 测试 API

```bash
# 重启后端服务
pm2 restart ckanim-server

# 测试 API
curl http://localhost:3002/api/games
curl http://localhost:3002/api/admin/games -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. 检查数据

```bash
# 使用 Prisma Studio 查看数据
npx prisma studio
```

---

## ⚠️ 注意事项

### 数据类型差异

| SQLite | PostgreSQL | 说明 |
|--------|------------|------|
| INTEGER | INTEGER | 相同 |
| REAL | DOUBLE PRECISION | 相同 |
| TEXT | TEXT | 相同 |
| BLOB | BYTEA | 二进制数据 |
| BOOLEAN | BOOLEAN | 相同 |
| DATETIME | TIMESTAMP | 时间类型 |

### 自增 ID

SQLite 使用 `AUTOINCREMENT`，PostgreSQL 使用 `SERIAL` 或 `IDENTITY`。
Prisma 会自动处理。

### 大小写敏感

- SQLite: 默认不区分大小写
- PostgreSQL: 区分大小写

确保查询时使用正确的大小写。

---

## 🔄 回滚方案

如果迁移失败，可以回滚到 SQLite：

```bash
cd server

# 恢复 SQLite schema
cp prisma/schema.sqlite.prisma prisma/schema.prisma

# 重新生成客户端
npx prisma generate

# 重启服务
pm2 restart ckanim-server
```

---

## 📊 迁移后优化

### 1. 添加索引

```prisma
model Video {
  @@index([gameId])
  @@index([actionId])
  @@index([published])
}
```

### 2. 配置连接池

在 `server/.env` 添加：
```env
DATABASE_URL="postgresql://...&connection_limit=10"
```

### 3. 定期备份

```bash
# 使用 pg_dump 备份
pg_dump -U ckanim -h localhost ckanim > backup.sql

# 恢复
psql -U ckanim -h localhost ckanim < backup.sql
```

---

## 🆘 故障排查

### 问题 1: 连接失败

```
Error: Can't reach database server at `host:5432`
```

**解决**:
1. 检查 PostgreSQL 是否运行：`systemctl status postgresql`
2. 检查防火墙：`ufw status`
3. 检查白名单（阿里云 RDS）
4. 测试连接：`psql -U ckanim -h host -d ckanim`

### 问题 2: 认证失败

```
Error: password authentication failed for user "ckanim"
```

**解决**:
1. 检查密码是否正确
2. 重置密码：`ALTER USER ckanim WITH PASSWORD 'new-password';`

### 问题 3: 迁移失败

```
Error: P1001: Can't reach database server
```

**解决**:
1. 检查 DATABASE_URL 格式
2. 确保 PostgreSQL 已启动
3. 检查网络连接

---

## 📝 检查清单

迁移前：
- [ ] PostgreSQL 已安装并运行
- [ ] 数据库已创建
- [ ] 用户权限已配置
- [ ] 环境变量已更新
- [ ] Schema 已切换
- [ ] 备份现有数据

迁移后：
- [ ] 数据库连接正常
- [ ] API 测试通过
- [ ] 数据完整
- [ ] 性能正常
- [ ] 备份策略已设置

---

_最后更新：2026-03-19_
