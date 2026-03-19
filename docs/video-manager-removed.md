# 视频管理页面移除记录

**日期**: 2026-03-19  
**原因**: 动作和视频合并管理，不再单独管理视频

---

## 📋 设计变更背景

根据 2026-03-18 的设计决策：

1. **动作 - 视频 1 对 1 关系** - 每个动作仅对应一个视频
2. **动作是元数据，视频是实际内容** - 两者完全绑定
3. **在动作管理页面统一操作** - 上传/编辑/删除视频都在动作管理中进行
4. **不再单独管理视频** - 视频管理页面冗余

---

## 🗑️ 已删除的文件

### 前端页面文件
- `admin/src/pages/Videos.jsx` - 视频管理主页面
- `admin/src/pages/Videos.css` - 视频管理样式
- `admin/src/pages/Videos.jsx.backup` - 备份文件

### 前端组件文件
- `admin/src/pages/components/VideoFilters.jsx` - 筛选器组件
- `admin/src/pages/components/VideoFilters.css` - 筛选器样式
- `admin/src/pages/components/VideoGrid.jsx` - 视频网格组件
- `admin/src/pages/components/VideoGrid.css` - 视频网格样式
- `admin/src/pages/components/VideoUploadModal.jsx` - 上传弹窗组件
- `admin/src/pages/components/VideoUploadModal.css` - 上传弹窗样式
- `admin/src/pages/components/VideoEditModal.jsx` - 编辑弹窗组件
- `admin/src/pages/components/VideoEditModal.css` - 编辑弹窗样式

### 路由配置
- `admin/src/App.jsx` - 删除 `/videos` 路由和 Videos 导入
- `admin/src/components/Layout.jsx` - 删除导航菜单中的"视频管理"项

---

## ✅ 保留的功能

### 后端 API（保留）
- `server/src/routes/videos.ts` - **保留**（动作管理页面使用）
  - `GET /api/admin/videos` - 查询视频列表
  - `POST /api/admin/videos/upload-token` - 获取上传令牌
  - `POST /api/admin/videos` - 创建视频
  - `PUT /api/admin/videos/:id` - 更新视频
  - `DELETE /api/admin/videos/:id` - 删除视频

### 前端服务（保留）
- `admin/src/lib/services.js` - `videosAPI` 对象（动作管理页面使用）

### 动作管理页面使用 videosAPI 的场景
1. 查询视频列表 - 显示动作对应的视频
2. 上传视频 - 动作上传视频（批量上传）
3. 创建视频 - 上传后创建视频记录
4. 更新视频 - 编辑视频信息
5. 删除视频 - 删除动作时级联删除视频

---

## 🎯 现在的视频管理流程

### 在动作管理页面操作
1. 访问 `http://localhost:3003/actions`
2. 选择游戏 → 分类 → 角色
3. 点击"📤 批量上传"
4. 选择视频文件（文件名 = 动作名称）
5. 自动创建动作 + 上传视频 + 关联

### 卡片操作
- **重新上传** - 替换视频文件
- **编辑** - 修改动作名称、标签
- **更改父级** - 移动到其他角色
- **删除** - 删除动作和视频

---

## 📊 影响范围

| 模块 | 状态 | 说明 |
|------|------|------|
| 视频管理页面 | ❌ 已删除 | 冗余功能 |
| 视频管理路由 | ❌ 已删除 | `/videos` |
| 视频管理导航 | ❌ 已删除 | 侧边栏菜单 |
| 视频 API | ✅ 保留 | 动作管理使用 |
| 视频上传功能 | ✅ 保留 | 动作管理中使用 |
| 视频删除功能 | ✅ 保留 | 动作删除时级联 |

---

## ✅ 验证清单

- [x] 导航菜单无"视频管理"入口
- [x] 访问 `/videos` 路由会重定向到首页
- [x] 动作管理页面正常工作
- [x] 视频上传功能正常（在动作管理中）
- [x] 后端 API 正常运行

---

## 📝 备注

- **videosAPI 服务保留** - 动作管理页面依赖
- **videos.ts 路由保留** - 后端 API 被动作管理使用
- **数据库 Video 表保留** - 存储视频数据
- **七牛云视频存储保留** - 视频文件存储

---

**完成时间**: 2026-03-19  
**验证人**: 波波
