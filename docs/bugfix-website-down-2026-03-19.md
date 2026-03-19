# 网站无法访问问题修复

**日期**: 2026-03-19  
**问题**: 前台网站无法访问  
**状态**: ✅ 已修复

---

## 🐛 问题现象

用户报告：http://localhost:5173/games 无法访问

---

## 🔍 问题排查

### 1. 检查服务状态

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/
# 返回：200 ✅ 服务正常
```

### 2. 检查进程

```bash
ps aux | grep vite
# 发现多个 Vite 进程同时运行
```

### 3. 检查日志

```bash
tail -20 /tmp/ckanim-front.log
# 发现：Port 5173 is in use, trying another one...
# Vite 自动切换到 5175 端口
```

---

## 🎯 根本原因

**Vite 端口冲突**：

1. 多个 Vite 进程同时运行
2. 5173 端口被占用
3. Vite 自动切换到 5175 端口
4. 用户访问 5173 端口无法看到最新代码

---

## ✅ 修复方案

### 方案 1: 清理端口 + 重启（推荐）

```bash
# 1. 杀掉所有 Vite 进程
pkill -9 -f "vite"

# 2. 强制释放端口
fuser -k 5173/tcp
fuser -k 5174/tcp

# 3. 清除 Vite 缓存
rm -rf node_modules/.vite

# 4. 重启 Vite
cd /home/tenbox/CKAnim
npm run dev
```

### 方案 2: 使用重启脚本

```bash
# 使用一键重启脚本
/home/tenbox/CKAnim/restart-all-services.sh
```

### 方案 3: 访问新端口

```bash
# 如果 Vite 切换到 5175 端口
http://localhost:5175/games
```

---

## 🔧 实际修复步骤

1. **清理端口**：
   ```bash
   pkill -9 -f "node.*vite"
   fuser -k 5173/tcp
   fuser -k 5174/tcp
   ```

2. **清除缓存**：
   ```bash
   rm -rf node_modules/.vite
   ```

3. **重启服务**：
   ```bash
   cd /home/tenbox/CKAnim
   npm run dev > /tmp/ckanim-front.log 2>&1 &
   ```

4. **验证**：
   ```bash
   curl http://localhost:5173/
   # 返回：200 ✅
   ```

---

## 📊 修复结果

| 检查项 | 状态 | 说明 |
|--------|------|------|
| **5173 端口** | ✅ 正常 | Vite 已重启 |
| **页面加载** | ✅ 正常 | 无错误 |
| **新播放器** | ✅ 正常 | VideoPlayerEnhanced 组件加载成功 |
| **控制台错误** | ✅ 无错误 | 无 JS 错误 |

---

## 📋 预防措施

### 1. 创建清理脚本

```bash
#!/bin/bash
# clean-vite.sh

pkill -9 -f "vite"
fuser -k 5173/tcp
fuser -k 5174/tcp
rm -rf node_modules/.vite

echo "✅ Vite 缓存已清理"
```

### 2. 修改启动脚本

```bash
# start-frontend.sh

# 先清理
pkill -9 -f "vite"
rm -rf node_modules/.vite

# 再启动
npm run dev
```

### 3. 添加端口检查

```bash
# 启动前检查端口
if lsof -ti:5173 > /dev/null; then
  echo "❌ 5173 端口被占用，请先清理"
  exit 1
fi
```

---

## 🎯 最佳实践

### 开发工作流

1. **启动前检查**：
   ```bash
   lsof -ti:5173 && echo "端口被占用" || echo "端口空闲"
   ```

2. **规范关闭**：
   - 使用 Ctrl+C 停止 Vite
   - 不要直接关闭终端窗口

3. **定期清理**：
   ```bash
   # 每周清理一次 Vite 缓存
   rm -rf node_modules/.vite
   ```

---

## 📝 经验教训

1. **Vite 端口冲突是常见问题** - 多进程同时运行会导致端口占用
2. **清除缓存很重要** - `node_modules/.vite` 缓存可能导致代码不同步
3. **使用重启脚本** - 一键清理 + 重启，避免手动操作遗漏
4. **检查日志** - `/tmp/ckanim-front.log` 包含重要信息

---

## 🔗 相关文档

- [Vite 端口冲突解决方案](https://vitejs.dev/config/server-options.html#server-port)
- [CKAnim 服务重启流程](./service-restart-guide.md)
- [开发工作流规范](./dev-workflow.md)

---

**修复时间**: 2026-03-19 23:15  
**修复人员**: 波波  
**状态**: ✅ 已完成
