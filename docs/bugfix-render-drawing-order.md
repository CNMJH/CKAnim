# renderDrawing 函数顺序问题修复

## 🐛 问题描述

**错误**: `Uncaught ReferenceError: Cannot access 'renderDrawing' before initialization`

**位置**: `VideoPlayerEnhanced.jsx:111:30`

**现象**: 点击动作视频按钮后页面白屏，控制台报错

---

## 🔍 根本原因

JavaScript 的**暂时性死区（Temporal Dead Zone, TDZ）**问题：

```jsx
// ❌ 错误的顺序
const renderCurrentFrameDrawings = useCallback((time) => {
  renderDrawing(ctx, drawing); // 引用了未初始化的函数
}, [drawings, showDrawing, renderDrawing]);

const renderDrawing = (ctx, drawing) => { ... }; // 定义在后面
```

**问题点**:
1. `renderCurrentFrameDrawings` 在第 87 行定义
2. `renderDrawing` 在第 114 行定义
3. `renderCurrentFrameDrawings` 内部调用了 `renderDrawing`
4. JavaScript 函数不会提升（hoist）通过变量赋值的函数

---

## ✅ 修复方案

### 方案 1: 移动函数定义位置（已采用）

将 `renderDrawing` 移到 `renderCurrentFrameDrawings` 之前：

```jsx
// ✅ 正确的顺序
const renderDrawing = (ctx, drawing) => {
  // ... 渲染逻辑
};

const renderCurrentFrameDrawings = useCallback((time) => {
  renderDrawing(ctx, drawing); // 安全引用
}, [drawings, showDrawing]); // 移除 renderDrawing 依赖
```

**修复后位置**:
- `renderDrawing`: 第 87 行（之前：第 114 行）
- `renderCurrentFrameDrawings`: 第 128 行（之前：第 87 行）

### 方案 2: 使用函数声明（未采用）

```jsx
// 函数声明会提升，但项目使用函数表达式风格
function renderDrawing(ctx, drawing) { ... }
```

---

## 🔧 修复细节

### 1. 移动函数位置

**修改前**:
```
行 87:  const renderCurrentFrameDrawings = useCallback(...)
行 114: const renderDrawing = (ctx, drawing) => { ... }
```

**修改后**:
```
行 87:  const renderDrawing = (ctx, drawing) => { ... }
行 128: const renderCurrentFrameDrawings = useCallback(...)
```

### 2. 清理依赖数组

**修改前**:
```jsx
}, [drawings, showDrawing, renderDrawing]);
```

**修改后**:
```jsx
}, [drawings, showDrawing]);
```

**原因**: `renderDrawing` 是稳定函数，不需要重新触发 useCallback

---

## 🧪 验证方法

### 测试步骤

1. 访问 http://localhost:5173/games
2. 选择游戏（如：英雄联盟）
3. 选择角色（如：盖伦）
4. 点击动作按钮（如：攻击）
5. ✅ **视频应该正常播放**
6. 点击"画板"按钮
7. ✅ **画板工具栏应该显示**
8. 选择文本工具（T）
9. 点击画布
10. ✅ **文本输入框应该弹出**

### 预期结果

- ✅ 页面不再白屏
- ✅ 视频正常加载播放
- ✅ 画板功能正常工作
- ✅ 文本工具可以正常使用
- ✅ 控制台无 `Cannot access 'renderDrawing'` 错误

---

## 📊 代码变更统计

**文件**: `src/components/VideoPlayerEnhanced.jsx`

**变更**:
- `renderDrawing` 函数：行 114 → 行 87（上移 27 行）
- `renderCurrentFrameDrawings`：行 87 → 行 128（下移 41 行）
- 依赖数组：移除 `renderDrawing`

**总计**: +28 行 -27 行（净增 1 行，主要是空行调整）

---

## 🎯 相关函数调用链

```
VideoPlayerEnhanced 组件
├── renderDrawing (行 87) ← 最先定义
│   └── 渲染画笔路径
│   └── 渲染文本（支持旋转）
│
├── renderCurrentFrameDrawings (行 128)
│   └── 调用 renderDrawing
│   └── 渲染全程绘画（permanent）
│   └── 渲染当前帧绘画（single）
│
├── useEffect (帧变化监听)
│   └── 调用 renderCurrentFrameDrawings
│
└── useEffect (drawings 变化监听)
    └── 调用 renderDrawing 直接渲染
```

---

## 📝 提交记录

**Commit**: `d1260ca`  
**消息**: fix: 彻底修复 renderDrawing 函数顺序问题

**变更**:
- 移动 `renderDrawing` 到第 87 行
- 更新 `renderCurrentFrameDrawings` 到第 128 行
- 清理 useCallback 依赖数组

---

## 🔮 预防措施

### 未来开发建议

1. **函数定义顺序**:
   - 被调用的函数先定义
   - 调用方后定义
   - 或使用函数声明（会提升）

2. **useCallback 依赖**:
   - 只包含真正变化的依赖
   - 稳定函数不需要加入依赖
   - 使用 ESLint 插件检查依赖

3. **代码组织**:
   - 工具函数放在组件顶部
   - 状态定义放在工具函数之后
   - useEffect/useCallback 放在最后

### ESLint 规则建议

```json
{
  "rules": {
    "no-use-before-define": ["error", { "functions": true }],
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

---

## 🎓 技术要点

### JavaScript 函数提升（Hoisting）

```jsx
// ❌ 函数表达式 - 不会提升
const myFunc = () => {};
myFunc(); // ReferenceError

// ✅ 函数声明 - 会提升
function myFunc() {}
myFunc(); // 正常工作
```

### 暂时性死区（TDZ）

```jsx
console.log(myVar); // ReferenceError
const myVar = 1;

console.log(myFunc()); // ReferenceError
const myFunc = () => {};
```

在 `const/let` 声明之前访问变量会触发 TDZ 错误。

---

## ✅ 总结

**问题**: `renderDrawing` 函数定义在使用它的 `renderCurrentFrameDrawings` 之后

**修复**: 将 `renderDrawing` 移到文件顶部，确保先定义后使用

**验证**: 页面正常加载，视频播放正常，画板功能正常

**预防**: 注意函数定义顺序，使用 ESLint 检查

---

**修复完成时间**: 2026-03-20  
**影响范围**: 视频播放器画板功能  
**优先级**: P0（阻塞性问题）
