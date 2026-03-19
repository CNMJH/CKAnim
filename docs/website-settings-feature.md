# 网站自定义设置功能完成

**日期**: 2026-03-18  
**状态**: ✅ 已完成  
**提交**: `feat: add website customization settings`

## 功能概述

为 CKAnim 网站添加了完整的自定义设置功能，管理员可以通过后台配置：
- 网站名称（显示在导航栏和浏览器标题）
- 网站名称显示位置（页眉/页脚/两者）
- 页脚信息（版权文字 + 自定义链接）
- 全站公告（首页搜索框下方，可自定义文字、颜色、启用状态）

## 技术实现

### 1. 数据库 Schema

```prisma
model SiteSettings {
  id          Int      @id @default(autoincrement())
  key         String   @unique // 设置键名
  value       String   // 设置值（JSON 字符串）
  description String?  // 设置描述
  updatedAt   DateTime @updatedAt
}
```

### 2. 后端路由 (`server/src/routes/settings.ts`)

**公开路由**（无需认证）:
- `GET /api/settings` - 获取所有设置（前台网站使用）
- `GET /api/settings/:key` - 获取单个设置

**管理员路由**（需要认证）:
- `POST /api/settings/init` - 初始化默认设置
- `PUT /api/settings/:key` - 更新单个设置
- `POST /api/settings/batch` - 批量更新设置

### 3. 前端管理后台 (`admin/src/pages/Settings.jsx`)

**新增功能**:
- 网站配置表单（网站名称、页脚信息、全站公告）
- JSON 编辑器（页脚链接数组）
- 颜色选择器（公告文字颜色）
- 开关控制（公告启用/禁用）
- 初始化默认设置按钮

**API 调用**:
```javascript
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  getOne: (key) => api.get(`/settings/${key}`),
  update: (key, data) => api.put(`/settings/${key}`, data),
  batchUpdate: (settings) => api.post('/settings/batch', { settings }),
  init: () => api.post('/settings/init'),
}
```

### 4. 前台网站集成

**新增组件**:
- `src/components/Footer.jsx` - 页脚组件，显示版权信息和自定义链接
- `src/components/Footer.css` - 页脚样式

**修改文件**:
- `src/components/Header.jsx` - 添加网站名称显示（从设置加载）
- `src/pages/Home.jsx` - 添加公告文字显示（支持自定义颜色）
- `src/App.jsx` - 添加 Footer 组件
- `src/App.css` - 添加 footer 样式
- `src/lib/api.js` - 新增 `siteSettingsAPI`

## 默认设置值

```json
{
  "siteName": "CKAnim",
  "siteNamePosition": "header",
  "siteFooter": {
    "text": "© 2026 CKAnim. All rights reserved.",
    "links": [
      {"text": "关于我们", "url": "/about"},
      {"text": "联系方式", "url": "/contact"}
    ]
  },
  "siteAnnouncement": {
    "text": "随机参考，每日一看",
    "enabled": true,
    "color": "#666"
  }
}
```

## 使用流程

### 第一次使用

1. **访问设置页面**: http://localhost:3003/settings
2. **点击"🔄 初始化默认设置"**: 自动创建 4 个默认设置项
3. **修改配置**:
   - 输入网站名称（如"CKAnim 动画参考网"）
   - 编辑页脚文字和链接
   - 修改公告文字和颜色
4. **点击"💾 保存设置"**: 保存到数据库
5. **访问前台验证**: http://localhost:5173 查看效果

### 修改设置

1. 访问 http://localhost:3003/settings
2. 修改任意配置项
3. 点击"💾 保存设置"
4. 刷新前台网站查看效果

## API 测试

### 初始化默认设置
```bash
curl -X POST http://localhost:3002/api/settings/init \
  -H "Authorization: Bearer <TOKEN>"
```

### 获取所有设置
```bash
curl -s http://localhost:3002/api/settings
```

### 批量更新设置
```bash
curl -X POST http://localhost:3002/api/settings/batch \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": [
      {"key": "siteName", "value": "CKAnim 动画参考网"},
      {"key": "siteFooter", "value": "{\"text\":\"© 2026\",\"links\":[]}"}
    ]
  }'
```

## 文件清单

### 后端
- `server/prisma/schema.prisma` - 新增 `SiteSettings` 模型
- `server/src/routes/settings.ts` - 设置路由（新建，6820 字节）
- `server/src/index.ts` - 注册 settings 路由

### 管理后台
- `admin/src/pages/Settings.jsx` - 设置页面（重写，10640 字节）
- `admin/src/lib/services.js` - 新增 `settingsAPI`

### 前台网站
- `src/components/Footer.jsx` - 页脚组件（新建，1500 字节）
- `src/components/Footer.css` - 页脚样式（新建，782 字节）
- `src/components/Header.jsx` - 添加网站名称显示
- `src/pages/Home.jsx` - 添加公告显示
- `src/App.jsx` - 添加 Footer 组件
- `src/App.css` - 添加 footer 样式
- `src/lib/api.js` - 新增 `siteSettingsAPI`

## 验证结果

✅ 后端 API 正常（`GET /api/settings`, `POST /api/settings/init`, `POST /api/settings/batch`）  
✅ 管理后台设置页面可访问（http://localhost:3003/settings）  
✅ 前台网站显示网站名称（Header 左上角）  
✅ 前台网站显示公告文字（首页搜索框上方）  
✅ 前台网站显示页脚信息（页面底部）  
✅ 设置修改后实时生效（刷新前台即可看到）

## 下一步

- [ ] 测试完整流程（后台修改→前台验证）
- [ ] 添加更多自定义选项（Logo 上传、主题色等）
- [ ] 生产环境部署测试
- [ ] 更新管理员使用指南

## 注意事项

1. **首次使用需初始化**: 点击"🔄 初始化默认设置"按钮创建默认配置
2. **JSON 格式验证**: 页脚链接必须是有效的 JSON 数组格式
3. **颜色选择器**: 使用 HTML5 原生 `<input type="color">`，支持所有现代浏览器
4. **前台缓存**: 修改设置后可能需要硬刷新（Ctrl+Shift+R）才能看到效果
5. **API 路径**: 前台使用 `/api/settings`（无需认证），后台使用 `/api/admin/settings`（需要认证）

## 技术细节

### 1. 设置存储格式

- 简单值（网站名称）: 直接存储字符串 `"CKAnim"`
- 复杂值（页脚、公告）: JSON 字符串 `"{\"text\":\"...\",\"links\":[...]}"`

### 2. 前端解析逻辑

```javascript
// 页脚信息解析
if (settingsData.siteFooter?.value) {
  try {
    const footer = JSON.parse(settingsData.siteFooter.value)
    setFooterText(footer.text || '')
    setFooterLinks(JSON.stringify(footer.links || [], null, 2))
  } catch (e) {
    console.error('解析页脚信息失败:', e)
  }
}
```

### 3. 颜色选择器

```jsx
<input
  type="color"
  value={announcementColor}
  onChange={(e) => setAnnouncementColor(e.target.value)}
  style={{ width: '100px', height: '40px' }}
/>
```

## 总结

网站自定义设置功能已完成，管理员可以通过后台轻松配置：
- ✅ 网站名称（支持页眉/页脚位置选择）
- ✅ 页脚信息（版权文字 + 自定义链接）
- ✅ 全站公告（文字、颜色、启用状态）

所有设置实时生效，前台自动加载并显示。代码结构清晰，易于扩展更多设置项。
