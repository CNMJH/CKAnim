# CKAnim 技术优化清单

**生成时间**: 2026-03-19  
**项目状态**: 开发中 (MVP 阶段)  
**代码统计**: 前端 997 行 + 后端 3334 行 + 管理后台 2863 行 = **7194 行**

---

## 📊 总体评估

| 维度 | 评分 | 说明 |
|------|------|------|
| **代码质量** | ⭐⭐⭐☆☆ | 功能完整，但部分文件过长 |
| **性能优化** | ⭐⭐⭐☆☆ | 基础优化已做，缺少高级优化 |
| **安全性** | ⭐⭐⭐☆☆ | 基础认证 OK，缺少速率限制等 |
| **可维护性** | ⭐⭐⭐⭐☆ | 文档齐全，但缺少测试 |
| **部署准备** | ⭐⭐☆☆☆ | 缺少生产环境配置 |

---

## 🔥 高优先级（P0 - 立即处理）

### 1. 代码重构 - 减少单文件行数

**问题**: 多个文件超过 300 行最佳实践

| 文件 | 行数 | 建议 |
|------|------|------|
| `admin/src/pages/Videos.jsx` | 843 行 | 拆分为 3-4 个组件 |
| `server/src/routes/videos.ts` | 657 行 | 拆分为上传/CRUD/删除模块 |
| `admin/src/pages/Actions.jsx` | 521 行 | 拆分为卡片/上传/筛选组件 |
| `server/src/routes/categories.ts` | 351 行 | 拆分为 CRUD 子模块 |
| `server/src/routes/games.ts` | 363 行 | 拆分为 CRUD 子模块 |

**建议拆分方案** (以 Videos.jsx 为例):
```
Videos.jsx (主容器，~150 行)
├── components/
│   ├── VideoFilters.jsx (筛选器，~100 行)
│   ├── VideoGrid.jsx (视频网格，~150 行)
│   ├── VideoUploadModal.jsx (上传弹窗，~200 行)
│   └── VideoEditModal.jsx (编辑弹窗，~150 行)
```

**工作量**: 2-3 天  
**风险**: 低（功能不变，仅重构）

---

### 2. 生产环境配置缺失

**问题**: 无 PM2 配置、无环境变量管理、无生产构建脚本

**需要创建**:
```bash
ecosystem.config.js          # PM2 进程管理
.dockerignore                # Docker 忽略文件
Dockerfile                   # 前端容器
Dockerfile.server            # 后端容器
docker-compose.yml           # 一键部署
deploy.sh                    # 部署脚本
```

**PM2 配置示例** (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [
    {
      name: 'ckanim-server',
      script: './server/dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
    },
    {
      name: 'ckanim-front',
      script: 'serve',
      args: 'dist',
      env: {
        PM2_SERVE_PATH: '/var/www/ckanim-front/dist',
        PM2_SERVE_PORT: 5173,
      },
    },
    {
      name: 'ckanim-admin',
      script: 'serve',
      args: 'dist',
      env: {
        PM2_SERVE_PATH: '/var/www/ckanim-admin/dist',
        PM2_SERVE_PORT: 3003,
      },
    },
  ],
};
```

**工作量**: 1 天  
**风险**: 中（需测试生产环境）

---

### 3. 数据库切换 PostgreSQL

**问题**: 当前使用 SQLite，不适合生产环境

**原因**:
- SQLite 并发写入受限（文件锁）
- 无备份/恢复机制
- 无数据迁移工具

**迁移步骤**:
1. 安装 PostgreSQL（阿里云 RDS 或自建）
2. 修改 `server/.env`:
   ```env
   DATABASE_URL="postgresql://user:pass@host:5432/ckanim?schema=public"
   ```
3. 修改 `schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
4. 运行迁移：`npx prisma migrate deploy`

**工作量**: 0.5 天  
**风险**: 中（需测试数据完整性）

---

### 4. 删除功能未完成

**问题**: 动作删除时未清理七牛云文件

**位置**: `server/src/routes/actions.ts` 第 249 行
```typescript
// TODO: 删除七牛云文件（视频和封面图）
```

**修复代码**:
```typescript
// 删除七牛云文件（视频和封面图）
if (action.video) {
  const keysToDelete = [action.video.qiniuKey];
  if (action.video.coverUrl) {
    keysToDelete.push(extractKeyFromUrl(action.video.coverUrl));
  }
  await deleteMultipleFiles(keysToDelete);
  server.log.info(`Deleted qiniu files for action ${actionId}`);
}
```

**工作量**: 0.1 天  
**风险**: 低

---

## ⚡ 中优先级（P1 - 本周处理）

### 5. 错误边界和异常处理

**问题**: 前端无全局错误边界，API 错误处理不完善

**当前状态**:
- ❌ 无 ErrorBoundary 组件
- ❌ 无全局错误处理
- ✅ 有 React Query 错误处理
- ✅ 有 API 拦截器（401 跳转登录）

**需要添加**:
```jsx
// components/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // 记录错误到日志服务
    logErrorToService(error, errorInfo);
  }
  
  render() {
    if (this.hasError) {
      return <ErrorFallback onRetry={this.reset} />;
    }
    return this.props.children;
  }
}
```

**工作量**: 0.5 天  
**风险**: 低

---

### 6. 加载状态和骨架屏

**问题**: 数据加载时页面空白，无 loading 提示

**当前状态**:
- ✅ 有 `isLoading` 状态
- ❌ 无骨架屏组件
- ❌ 无加载进度提示

**建议**:
```jsx
// 使用 react-loading-skeleton
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

function VideoCardSkeleton() {
  return (
    <div className="video-card">
      <Skeleton height={180} />
      <Skeleton width="60%" />
      <Skeleton width="40%" />
    </div>
  );
}
```

**工作量**: 0.5 天  
**风险**: 低

---

### 7. 表单验证增强

**问题**: 表单验证不完整，用户可输入无效数据

**当前问题**:
- ❌ 无前端验证（长度、格式）
- ✅ 有后端验证
- ❌ 无实时错误提示

**建议添加** (使用 react-hook-form + zod):
```jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  name: z.string().min(2).max(50),
  code: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().max(500),
});

function ActionForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });
  
  // 实时显示错误提示
}
```

**工作量**: 1 天  
**风险**: 低

---

### 8. 速率限制和防刷

**问题**: API 无请求频率限制，易被滥用

**当前状态**:
- ✅ JWT 认证
- ✅ CORS 配置
- ❌ 无速率限制
- ❌ 无登录失败限制

**建议添加** (使用 @fastify/rate-limit):
```typescript
import rateLimit from '@fastify/rate-limit';

await server.register(rateLimit, {
  max: 100,           // 100 次请求
  timeWindow: '1 minute',
  whitelist: ['127.0.0.1'],  // 白名单
});

// 登录接口单独限制
server.register(rateLimit, {
  max: 5,
  timeWindow: '15 minutes',
}, { prefix: '/api/admin/login' });
```

**工作量**: 0.5 天  
**风险**: 低

---

## 📈 低优先级（P2 - 本月处理）

### 9. 性能优化

**图片优化**:
- [ ] 懒加载（使用 `loading="lazy"`）
- [ ] WebP 格式转换
- [ ] 响应式图片（srcset）
- [ ] CDN 缓存策略

**代码优化**:
- [ ] 代码分割（React.lazy + Suspense）
- [ ] 路由懒加载
- [ ] 组件 memo 化
- [ ] 虚拟列表（长列表场景）

**构建优化**:
- [ ] Tree shaking
- [ ] 压缩优化
- [ ] 缓存策略（Cache-Control）
- [ ] Gzip/Brotli 压缩

**工作量**: 2-3 天  
**风险**: 低

---

### 10. 日志和监控

**当前状态**:
- ✅ 后端有 Fastify 日志
- ❌ 无日志文件轮转
- ❌ 无错误追踪
- ❌ 无性能监控

**建议添加**:
```bash
# 日志管理
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# 监控服务（选一个）
- Sentry（错误追踪）
- LogRocket（会话回放）
- Google Analytics（用户行为）
```

**工作量**: 1 天  
**风险**: 低

---

### 11. 单元测试

**当前状态**:
- ❌ 无任何测试文件
- ❌ 无测试框架
- ❌ 无 CI/CD 集成

**建议添加**:
```bash
# 安装测试框架
npm install -D vitest @testing-library/react

# 创建测试文件
src/components/__tests__/VideoCard.test.jsx
server/src/routes/__tests__/videos.test.ts
```

**优先级**:
1. 核心工具函数（100% 覆盖）
2. API 路由（80% 覆盖）
3. 关键组件（60% 覆盖）

**工作量**: 3-5 天  
**风险**: 低

---

### 12. SEO 优化

**当前状态**:
- ❌ 无 meta 标签
- ❌ 无 sitemap
- ❌ 无结构化数据
- ❌ SSR 未启用

**建议添加**:
```jsx
// components/SEO.jsx
function SEO({ title, description, image }) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:image" content={image} />
    </Helmet>
  );
}
```

**工作量**: 1 天  
**风险**: 低

---

## 🎯 可选优化（P3 - 有时间再做）

### 13. 用户体验优化

- [ ] 搜索自动补全
- [ ] 键盘快捷键
- [ ] 暗黑模式
- [ ] 移动端适配优化
- [ ] 视频预览（悬停播放）
- [ ] 批量操作（批量删除/发布）

### 14. 功能扩展

- [ ] 用户系统（收藏/点赞）
- [ ] 评论系统
- [ ] 视频转码（多清晰度）
- [ ] 数据分析后台
- [ ] API 文档（Swagger/OpenAPI）

### 15. 开发体验

- [ ] ESLint + Prettier 配置
- [ ] Husky 预提交钩子
- [ ] Commitlint 提交规范
- [ ] Storybook 组件文档
- [ ] TypeScript 严格模式

---

## 📋 实施计划

### 第 1 周（P0 高优先级）✅ 进行中
- [x] ~~修复动作删除七牛云清理~~ ✅ **已完成 (2026-03-19)**
- [x] ~~创建 PM2 配置文件~~ ✅ **已完成 (2026-03-19)**
  - 创建文件：`ecosystem.config.js`
  - 创建文件：`deploy.sh`（部署脚本）
  - 创建文件：`Dockerfile` + `Dockerfile.server`
  - 创建文件：`docker-compose.yml`
  - 创建文件：`.env.production.example`
  - 创建文件：`docs/DEPLOYMENT.md`（部署指南）
- [ ] 数据库切换 PostgreSQL
- [ ] 重构 Videos.jsx（拆分组件）
- [ ] 重构 videos.ts（模块化）

### 第 2 周（P1 中优先级）
- [ ] 添加错误边界
- [ ] 实现骨架屏加载
- [ ] 增强表单验证
- [ ] 添加速率限制

### 第 3-4 周（P2 低优先级）
- [ ] 性能优化（图片、代码、构建）
- [ ] 日志和监控配置
- [ ] 单元测试框架搭建
- [ ] SEO 基础优化

---

## 📊 优化前后对比

| 指标 | 优化前 | 优化后（目标） |
|------|--------|---------------|
| 最大文件行数 | 843 行 | <300 行 |
| 首屏加载时间 | ~2s | <1s |
| Lighthouse 分数 | ~70 | >90 |
| 测试覆盖率 | 0% | >60% |
| 部署时间 | 手动 30min | 自动 5min |
| API 响应时间 (P95) | ~200ms | <100ms |

---

## 🚨 风险提示

1. **数据库迁移风险**: 迁移前务必备份数据
2. **重构风险**: 每次重构后需完整测试
3. **生产配置风险**: 先在测试环境验证
4. **依赖升级风险**: 逐步升级，避免一次性升级多个包

---

## 📝 总结

**当前优势**:
- ✅ 功能完整（核心功能已实现）
- ✅ 文档齐全（40+ 技术文档）
- ✅ 代码结构清晰（前后端分离）
- ✅ 有错误日志记录

**主要不足**:
- ❌ 单文件过长（维护困难）
- ❌ 无生产环境配置
- ❌ 无测试覆盖
- ❌ 安全性待加强

**建议顺序**: P0 → P1 → P2 → P3，每完成一个阶段再进入下一阶段。

---

_最后更新：2026-03-19_
