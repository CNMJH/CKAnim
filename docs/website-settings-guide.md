# 网站自定义设置使用指南

## 📍 在哪里管理？

**管理后台 → 设置页面**

访问地址：http://localhost:3003/settings

## 🎯 功能说明

### 1. 网站名称配置

- **网站名称**: 显示在导航栏左上角和浏览器标题栏
- **显示位置**: 
  - 仅页眉 - 只在顶部导航栏显示
  - 仅页脚 - 只在页面底部显示
  - 页眉和页脚 - 两处都显示

**示例**:
```
网站名称：CKAnim 动画参考网
显示位置：header
```

### 2. 页脚信息配置

- **页脚文字**: 显示在页面底部的版权信息
- **页脚链接**: 自定义链接数组（JSON 格式）

**示例**:
```json
页脚文字：© 2026 CKAnim. All rights reserved.

页脚链接：
[
  {"text": "关于我们", "url": "/about"},
  {"text": "联系方式", "url": "/contact"},
  {"text": "隐私政策", "url": "/privacy"}
]
```

**JSON 格式说明**:
- 必须是有效的 JSON 数组
- 每个链接包含 `text`（显示文字）和 `url`（链接地址）
- 可以是内部链接（`/about`）或外部链接（`https://example.com`）

### 3. 全站公告配置

- **公告文字**: 显示在首页搜索框下方的提醒文字
- **启用/禁用**: 控制公告是否显示
- **文字颜色**: 使用颜色选择器自定义文字颜色

**示例**:
```
公告文字：随机参考，每日一看
启用：✅
颜色：#666（灰色）
```

## 📝 使用流程

### 第一次使用

1. **访问设置页面**
   - 打开 http://localhost:3003/settings
   - 登录管理员账户（admin / admin123）

2. **初始化默认设置**
   - 点击右上角 "🔄 初始化默认设置" 按钮
   - 系统会自动创建 4 个默认配置项

3. **修改配置**
   - 网站名称：输入你的网站名称
   - 页脚文字：输入版权信息
   - 页脚链接：输入 JSON 数组（可留空）
   - 公告文字：输入提醒文字
   - 公告颜色：选择颜色

4. **保存设置**
   - 点击 "💾 保存设置" 按钮
   - 等待保存成功提示

5. **查看效果**
   - 访问前台网站 http://localhost:5173
   - 按 Ctrl+Shift+R 硬刷新浏览器
   - 查看网站名称、页脚、公告是否显示

### 修改现有设置

1. 访问 http://localhost:3003/settings
2. 修改任意配置项
3. 点击 "💾 保存设置"
4. 刷新前台网站查看效果

## 🎨 配置示例

### 示例 1：个人网站
```
网站名称：小明的动画库
显示位置：header
页脚文字：© 2026 小明动画库
页脚链接：[{"text": "GitHub", "url": "https://github.com/xxx"}]
公告文字：欢迎来到我的动画参考库！
公告颜色：#667eea
```

### 示例 2：企业网站
```
网站名称：XX 游戏动画资源库
显示位置：both
页脚文字：© 2026 XX 公司 版权所有
页脚链接：[
  {"text": "关于我们", "url": "/about"},
  {"text": "联系方式", "url": "/contact"},
  {"text": "服务条款", "url": "/terms"}
]
公告文字：工作时间：周一至周五 9:00-18:00
公告颜色：#333
```

### 示例 3：简洁风格
```
网站名称：CKAnim
显示位置：header
页脚文字：
页脚链接：[]
公告文字：
启用公告：❌
```

## ⚠️ 注意事项

1. **首次使用必须初始化**
   - 点击 "🔄 初始化默认设置" 按钮
   - 否则保存会失败

2. **JSON 格式必须正确**
   - 页脚链接必须是有效的 JSON 数组
   - 使用双引号 `"` 而非单引号 `'`
   - 最后一个元素后不能有逗号

3. **修改后需要刷新前台**
   - 按 Ctrl+Shift+R 硬刷新
   - 或清除浏览器缓存

4. **颜色选择器**
   - 点击颜色框打开颜色选择器
   - 也可以直接输入十六进制颜色值（如 `#ff0000`）

## 🔧 故障排查

### 问题 1：保存失败
**原因**: 未初始化设置  
**解决**: 点击 "🔄 初始化默认设置"

### 问题 2：页脚链接保存失败
**原因**: JSON 格式错误  
**解决**: 检查 JSON 格式，使用双引号，确保数组格式正确

### 问题 3：修改后前台不显示
**原因**: 浏览器缓存  
**解决**: 按 Ctrl+Shift+R 硬刷新或清除缓存

### 问题 4：页面空白或报错
**原因**: 服务未启动  
**解决**: 
```bash
# 检查服务状态
curl http://localhost:3003
curl http://localhost:5173

# 重启服务
cd /home/tenbox/CKAnim/admin
npm run dev
```

## 📊 设置存储位置

- **数据库表**: `SiteSettings`
- **存储格式**: Key-Value（JSON 字符串）
- **设置项**:
  - `siteName` - 网站名称
  - `siteNamePosition` - 显示位置
  - `siteFooter` - 页脚信息（JSON）
  - `siteAnnouncement` - 全站公告（JSON）

## 🚀 API 接口

### 获取所有设置
```bash
curl http://localhost:3002/api/settings
```

### 初始化默认设置
```bash
curl -X POST http://localhost:3002/api/settings/init \
  -H "Authorization: Bearer <TOKEN>"
```

### 批量更新设置
```bash
curl -X POST http://localhost:3002/api/settings/batch \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": [
      {"key": "siteName", "value": "新网站名称"}
    ]
  }'
```

---

**最后更新**: 2026-03-19  
**文档路径**: `/home/tenbox/CKAnim/docs/website-settings-guide.md`
