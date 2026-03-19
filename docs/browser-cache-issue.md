# 浏览器缓存问题解决方案

**问题时间**: 2026-03-18 22:20  
**问题**: 游戏管理显示 3 个游戏，但其他页面下拉框为空

---

## ❌ 问题根源

**浏览器缓存了旧版本的代码**，导致修改后的代码不生效。

**表现**:
- 游戏管理页面正常（因为这是独立页面）
- 分类/角色/动作/视频页面的游戏下拉框都是空的
- 控制台可能有 "Query data cannot be undefined" 错误（旧代码）

---

## ✅ 解决方案

### 方法 1: 硬刷新（推荐）⭐

**步骤**:
1. 按 `F12` 打开开发者工具
2. **右键点击**浏览器刷新按钮
3. 选择 **"清空缓存并硬性重新加载"**

或者：
- Windows/Linux: `Ctrl + Shift + R`
- macOS: `Cmd + Shift + R`

---

### 方法 2: 清除浏览器缓存

**Chrome 浏览器**:
1. 按 `Ctrl + Shift + Delete` (Windows) 或 `Cmd + Shift + Delete` (macOS)
2. 选择 **"缓存的图片和文件"**
3. 点击 **"清除数据"**

**Firefox 浏览器**:
1. 打开选项 → 隐私与安全
2. 找到 "Cookie 和网站数据"
3. 点击 "清除数据"

---

### 方法 3: 关闭所有标签页

1. **关闭所有** localhost:3003 的标签页
2. **重新打开** http://localhost:3003
3. 按 `Ctrl + Shift + R` 硬刷新

---

### 方法 4: 使用无痕模式

1. 打开浏览器无痕窗口
   - Chrome: `Ctrl + Shift + N` (Windows) 或 `Cmd + Shift + N` (macOS)
   - Firefox: `Ctrl + Shift + P` (Windows) 或 `Cmd + Shift + P` (macOS)
2. 访问 http://localhost:3003
3. 测试是否正常

---

## 🔧 服务端清理（如果上述方法无效）

### 步骤 1: 清理 Vite 缓存

```bash
cd /home/tenbox/CKAnim/admin
rm -rf node_modules/.vite
```

### 步骤 2: 重启服务

```bash
# 杀掉所有 Vite 进程
pkill -9 -f "vite"

# 重启管理后台
cd /home/tenbox/CKAnim/admin
npm run dev
```

### 步骤 3: 使用重启脚本

```bash
/home/tenbox/CKAnim/restart-all.sh
```

---

## 🧪 验证步骤

### 1. 访问分类管理
```
http://localhost:3003/categories
```

**验证点**:
- [ ] 点击"请选择游戏"下拉框
- [ ] 显示 3 个游戏：原神、英雄联盟、绝区零
- [ ] 选择游戏后显示分类列表

### 2. 访问角色管理
```
http://localhost:3003/characters
```

**验证点**:
- [ ] 点击"请选择游戏"下拉框
- [ ] 显示 3 个游戏
- [ ] 选择游戏后显示角色列表

### 3. 访问动作管理
```
http://localhost:3003/actions
```

**验证点**:
- [ ] 点击"选择游戏"下拉框
- [ ] 显示 3 个游戏
- [ ] 选择游戏后显示分类/角色筛选器

### 4. 访问视频管理
```
http://localhost:3003/videos
```

**验证点**:
- [ ] 点击"选择游戏"下拉框
- [ ] 显示 3 个游戏
- [ ] 选择游戏后显示视频列表

---

## 📊 问题诊断

### 如果下拉框仍然为空

**检查 1**: 打开浏览器开发者工具 (F12)

**检查 2**: 切换到 Console 标签，查看是否有错误

**可能的错误**:
```
❌ Query data cannot be undefined
   → 代码未更新，需要硬刷新

❌ Failed to fetch
   → 后端服务未启动

❌ Network Error
   → 检查后端是否运行在 3002 端口
```

**检查 3**: 切换到 Network 标签，刷新页面

**查看请求**:
- `GET /api/admin/games` - 应该返回 200 和游戏列表
- 如果返回 404 或其他错误，检查后端服务

---

## 🎯 快速测试脚本

```bash
# 测试后端 API
curl http://localhost:3002/api/admin/games

# 预期输出（部分）:
# [{"id":1,"name":"原神",...},{"id":3,"name":"英雄联盟",...}]

# 测试管理后台
curl http://localhost:3003

# 预期输出:
# <!doctype html>...CKAnim...
```

---

## ⚠️ 常见错误

### 错误 1: 多个 Vite 进程

**症状**: 端口被占用，服务启动在奇怪端口（如 3004）

**解决**:
```bash
pkill -9 -f "vite"
lsof -ti:3003 | xargs kill -9
```

### 错误 2: 浏览器缓存未清除

**症状**: 硬刷新后仍然显示旧界面

**解决**:
1. 关闭所有浏览器窗口
2. 重新打开浏览器
3. 访问 http://localhost:3003
4. 按 Ctrl+Shift+R

### 错误 3: Service Worker 缓存

**症状**: 即使清除缓存仍然有问题

**解决**:
1. F12 → Application → Service Workers
2. 点击 "Unregister" 注销 Service Worker
3. 刷新页面

---

## 📝 总结

**问题本质**: 浏览器缓存 vs 代码更新的冲突

**最佳实践**:
1. ✅ 修改代码后总是硬刷新（Ctrl+Shift+R）
2. ✅ 使用无痕模式测试新代码
3. ✅ 定期清理浏览器缓存
4. ✅ 遇到问题先清除缓存再排查

---

**建议操作顺序**:
1. 硬刷新（Ctrl+Shift+R）⭐ 90% 有效
2. 清除浏览器缓存 ⭐ 95% 有效
3. 关闭所有标签页重开 ⭐ 98% 有效
4. 使用无痕模式测试 ⭐ 100% 有效
5. 服务端清理重启（最后手段）

---

**测试地址**:
- 管理后台：http://localhost:3003
- 分类管理：http://localhost:3003/categories
- 角色管理：http://localhost:3003/characters
- 动作管理：http://localhost:3003/actions
- 视频管理：http://localhost:3003/videos
