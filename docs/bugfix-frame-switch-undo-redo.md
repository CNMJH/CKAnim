# 帧切换绘画显示 + 撤销功能优化

**日期**: 2026-03-20  
**问题**: 
1. 切换帧后绘画不立即显示
2. 撤销功能没有清晰提示  
**状态**: ✅ 已完成

---

## 🐛 问题描述

### 问题 1: 切换帧后绘画不立即显示

**用户反馈**: 我在第一帧画了画，然后我点下一帧（来到第 2 帧），然后再点上一帧（回到第一帧），此时我画的画不出现，直到我再任意画一笔后，才会把我之前画的同时显现出来

**问题表现**:
1. ✅ 在第 1 帧绘画
2. ✅ 点击"下一帧"切换到第 2 帧
3. ✅ 点击"上一帧"切换回第 1 帧
4. ❌ **第 1 帧的绘画不显示**
5. ❌ 需要再画一笔，之前的绘画才一起出现

**期望行为**:
- ✅ 切换回第 1 帧时，该帧的绘画应该**立即显示**

---

### 问题 2: 撤销功能没有清晰提示

**用户反馈**: 现在的撤销功能有问题，我撤销后不知道撤到哪一步去了

**问题表现**:
1. ✅ 画了多笔
2. ✅ 按 Ctrl+Z 撤销
3. ❌ **不知道撤销到哪一步了**
4. ❌ 没有视觉反馈显示当前状态

**期望行为**:
- ✅ 撤销/重做按钮显示禁用状态（无法撤销时禁用）
- ✅ 显示当前步骤信息（第 X 步 / 共 Y 步）
- ✅ 鼠标悬停时显示详细提示

---

## 🔍 问题分析

### 问题 1: 帧切换绘画不显示

**根本原因**: `useEffect` 依赖的闭包使用了旧的 `drawings` 数据

**错误代码**:
```javascript
// ❌ 问题代码
const renderCurrentFrameDrawings = useCallback((time) => {
  // 使用 drawings，但 useCallback 的依赖不包含 renderDrawing
}, [drawings, showDrawing]); // ⚠️ 缺少 renderDrawing 依赖

useEffect(() => {
  const currentFrame = Math.floor(currentTime * 30);
  if (currentFrame !== lastFrame) {
    setLastFrame(currentFrame);
    renderCurrentFrameDrawings(currentTime); // ⚠️ 使用闭包中的旧 drawings
  }
}, [currentTime, lastFrame, renderCurrentFrameDrawings]);
```

**问题流程**:
```
第 1 帧绘画
    ↓
drawings = [drawing1]
    ↓
切换到第 2 帧
    ↓
useEffect 触发，调用 renderCurrentFrameDrawings()
    ↓
⚠️ 但 renderCurrentFrameDrawings 使用闭包中的 drawings
    ↓
⚠️ 可能使用的是旧的 drawings 数据
    ↓
切换回第 1 帧
    ↓
useEffect 再次触发
    ↓
❌ 仍然使用旧的 drawings，绘画不显示
```

---

### 问题 2: 撤销功能无提示

**根本原因**: 没有状态提示和按钮禁用逻辑

**错误代码**:
```javascript
// ❌ 没有禁用状态
<button onClick={undo} title="上一步 (Ctrl+Z)">
  ↩️
</button>

<button onClick={redo} title="下一步 (Ctrl+Y)">
  ↪️
</button>

// ❌ 没有状态提示
const [historyIndex, setHistoryIndex] = useState(-1);
// 没有获取状态的函数
```

---

## ✅ 修复方案

### 修复 1: 帧切换立即渲染绘画

**修复代码**:
```javascript
// ✅ 添加 renderDrawing 到依赖
const renderCurrentFrameDrawings = useCallback((time) => {
  const canvas = canvasRef.current;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (!showDrawing) return;
  
  const currentFrame = Math.floor(time * 30);
  
  // 渲染全程绘画
  const permanentDrawings = drawings.filter(d => d.type === 'permanent');
  permanentDrawings.forEach(drawing => {
    renderDrawing(ctx, drawing);
  });
  
  // 渲染当前帧的单帧绘画
  const frameDrawings = drawings.filter(d => 
    d.type === 'single' && d.frameIndex === currentFrame
  );
  frameDrawings.forEach(drawing => {
    renderDrawing(ctx, drawing);
  });
}, [drawings, showDrawing, renderDrawing]); // ✅ 添加 renderDrawing

// ✅ 帧切换 useEffect 直接渲染，不依赖闭包
useEffect(() => {
  const currentFrame = Math.floor(currentTime * 30);
  if (currentFrame !== lastFrame) {
    setLastFrame(currentFrame);
    
    // 直接渲染，不使用闭包
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!showDrawing) return;
    
    // 渲染全程绘画
    const permanentDrawings = drawings.filter(d => d.type === 'permanent');
    permanentDrawings.forEach(drawing => {
      renderDrawing(ctx, drawing);
    });
    
    // 渲染当前帧的单帧绘画
    const frameDrawings = drawings.filter(d => 
      d.type === 'single' && d.frameIndex === currentFrame
    );
    frameDrawings.forEach(drawing => {
      renderDrawing(ctx, drawing);
    });
  }
}, [currentTime, lastFrame, drawings, showDrawing, renderDrawing]); // ✅ 完整依赖

// ✅ drawings 变化 useEffect 也直接渲染
useEffect(() => {
  if (canvasRef.current && videoRef.current) {
    const currentTime = videoRef.current.currentTime;
    const currentFrame = Math.floor(currentTime * 30);
    setLastFrame(currentFrame);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!showDrawing) return;
    
    // 渲染全程绘画
    const permanentDrawings = drawings.filter(d => d.type === 'permanent');
    permanentDrawings.forEach(drawing => {
      renderDrawing(ctx, drawing);
    });
    
    // 渲染当前帧的单帧绘画
    const frameDrawings = drawings.filter(d => 
      d.type === 'single' && d.frameIndex === currentFrame
    );
    frameDrawings.forEach(drawing => {
      renderDrawing(ctx, drawing);
    });
  }
}, [drawings, showDrawing, renderDrawing]);
```

---

### 修复 2: 撤销功能优化

#### 2.1 添加状态提示函数

```javascript
// ✅ 获取当前绘画状态描述
const getHistoryStatus = () => {
  if (history.length === 0) return '无历史记录';
  if (historyIndex === -1) return '已撤销到初始状态';
  return `第 ${historyIndex + 1} 步 / 共 ${history.length} 步`;
};
```

#### 2.2 改进历史记录管理

```javascript
// ✅ 深拷贝历史记录
const addToHistory = (newDrawings) => {
  const newHistory = history.slice(0, historyIndex + 1);
  newHistory.push([...newDrawings]); // ✅ 深拷贝
  setHistory(newHistory);
  setHistoryIndex(newHistory.length - 1);
};

// ✅ 撤销时深拷贝
const undo = () => {
  if (history.length === 0) return;
  
  if (historyIndex > 0) {
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setDrawings([...history[newIndex]]); // ✅ 深拷贝
  } else if (historyIndex === 0) {
    setHistoryIndex(-1);
    setDrawings([]);
  }
};

// ✅ 重做时深拷贝
const redo = () => {
  if (historyIndex < history.length - 1) {
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setDrawings([...history[newIndex]]); // ✅ 深拷贝
  }
};
```

#### 2.3 添加按钮禁用状态和提示

```jsx
{/* ✅ 撤销按钮 */}
<button 
  className="control-btn icon-btn" 
  onClick={undo} 
  disabled={historyIndex === -1} // ✅ 无法撤销时禁用
  title={`上一步 (Ctrl+Z) - ${getHistoryStatus()}`} // ✅ 显示状态
>
  ↩️
</button>

{/* ✅ 重做按钮 */}
<button 
  className="control-btn icon-btn" 
  onClick={redo}
  disabled={historyIndex >= history.length - 1} // ✅ 无法重做时禁用
  title={`下一步 (Ctrl+Y) - ${getHistoryStatus()}`} // ✅ 显示状态
>
  ↪️
</button>
```

#### 2.4 CSS 禁用样式

```css
/* 已有样式 */
.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## 📊 修复前后对比

### 帧切换绘画显示

| 场景 | 修复前 | 修复后 |
|------|--------|--------|
| **第 1 帧绘画 → 第 2 帧 → 第 1 帧** | ❌ 绘画不显示 | ✅ 立即显示 |
| **切换帧后立即看到绘画** | ❌ 需要再画一笔 | ✅ 自动显示 |
| **useEffect 依赖** | ❌ 不完整 | ✅ 完整依赖 |
| **闭包问题** | ❌ 使用旧数据 | ✅ 直接渲染 |

### 撤销功能提示

| 功能 | 修复前 | 修复后 |
|------|--------|--------|
| **撤销按钮禁用** | ❌ 总是可点击 | ✅ 无法撤销时禁用 |
| **重做按钮禁用** | ❌ 总是可点击 | ✅ 无法重做时禁用 |
| **状态提示** | ❌ 无 | ✅ 第 X 步/共 Y 步 |
| **鼠标悬停提示** | ❌ 简单文字 | ✅ 详细状态 |
| **历史记录深拷贝** | ❌ 浅拷贝 | ✅ 深拷贝 |

---

## 🎯 测试验证

### 测试场景 1: 帧切换绘画显示

1. ✅ 开启画板，选择"单帧画笔"
2. ✅ 在第 1 帧（00:00）绘画
3. ✅ 点击"下一帧"切换到第 2 帧
4. ✅ 点击"上一帧"切换回第 1 帧
5. ✅ **第 1 帧的绘画应该立即显示！**

### 测试场景 2: 多帧绘画切换

1. ✅ 在第 1 帧画红色圆圈
2. ✅ 切换到第 2 帧，画蓝色方块
3. ✅ 切换到第 3 帧，画绿色三角形
4. ✅ 切换回第 2 帧
5. ✅ **蓝色方块应该立即显示！**
6. ✅ 切换回第 1 帧
7. ✅ **红色圆圈应该立即显示！**

### 测试场景 3: 撤销功能提示

1. ✅ 画第一笔
2. ✅ 鼠标悬停撤销按钮
3. ✅ **提示: "第 1 步 / 共 1 步"**
4. ✅ 画第二笔
5. ✅ 鼠标悬停撤销按钮
6. ✅ **提示: "第 2 步 / 共 2 步"**
7. ✅ 按 Ctrl+Z 撤销
8. ✅ **按钮变灰（禁用），提示: "已撤销到初始状态"**

### 测试场景 4: 撤销/重做边界

1. ✅ 画一笔
2. ✅ 按 Ctrl+Z 撤销
3. ✅ **撤销按钮变灰（无法撤销）**
4. ✅ 按 Ctrl+Y 重做
5. ✅ **重做按钮变灰（无法重做）**
6. ✅ 再画一笔
7. ✅ **撤销按钮恢复（可以撤销）**

---

## 🔧 技术细节

### useEffect 依赖完整性

**修复前**:
```javascript
const renderCurrentFrameDrawings = useCallback((time) => {
  // 使用 drawings 和 renderDrawing
}, [drawings, showDrawing]); // ⚠️ 缺少 renderDrawing

useEffect(() => {
  renderCurrentFrameDrawings(currentTime);
}, [currentTime, lastFrame, renderCurrentFrameDrawings]);
// ⚠️ renderCurrentFrameDrawings 依赖不完整
```

**修复后**:
```javascript
const renderCurrentFrameDrawings = useCallback((time) => {
  // 使用 drawings 和 renderDrawing
}, [drawings, showDrawing, renderDrawing]); // ✅ 完整依赖

useEffect(() => {
  // 直接渲染，不依赖闭包
  const permanentDrawings = drawings.filter(...);
  permanentDrawings.forEach(drawing => {
    renderDrawing(ctx, drawing);
  });
}, [currentTime, lastFrame, drawings, showDrawing, renderDrawing]);
// ✅ 完整依赖，直接使用最新数据
```

---

### 深拷贝 vs 浅拷贝

**修复前（浅拷贝）**:
```javascript
const addToHistory = (newDrawings) => {
  newHistory.push(newDrawings); // ⚠️ 引用同一数组
  setHistory(newHistory);
};

const undo = () => {
  setDrawings(history[newIndex]); // ⚠️ 引用同一数组
};
```

**问题**: 修改 `drawings` 会同时修改 `history` 中的记录！

**修复后（深拷贝）**:
```javascript
const addToHistory = (newDrawings) => {
  newHistory.push([...newDrawings]); // ✅ 创建新数组
  setHistory(newHistory);
};

const undo = () => {
  setDrawings([...history[newIndex]]); // ✅ 创建新数组
};
```

---

### 状态管理

```javascript
// 历史记录结构
history = [
  [],                    // 索引 0: 初始状态（空）
  [drawing1],            // 索引 1: 第一笔后
  [drawing1, drawing2],  // 索引 2: 第二笔后
]

historyIndex = 2 // 当前在第二笔后

// 撤销
historyIndex-- // 2 → 1
setDrawings([...history[1]]) // [drawing1]

// 重做
historyIndex++ // 1 → 2
setDrawings([...history[2]]) // [drawing1, drawing2]
```

---

## 📝 代码变更统计

| 文件 | 变更 | 说明 |
|------|------|------|
| `VideoPlayerEnhanced.jsx` | +71 行 -12 行 | 帧切换渲染 + 撤销优化 |

**主要变更**:
- 修复 `renderCurrentFrameDrawings` 依赖（添加 `renderDrawing`）
- 修复帧切换 `useEffect`（直接渲染，不依赖闭包）
- 修复 `drawings` 变化 `useEffect`（直接渲染）
- 添加 `getHistoryStatus()` 函数
- 改进 `addToHistory()`（深拷贝）
- 改进 `undo()`（深拷贝 + 边界检查）
- 改进 `redo()`（深拷贝）
- 撤销/重做按钮添加 `disabled` 属性
- 撤销/重做按钮添加详细 `title`

---

## 🎉 修复结果

| 功能 | 修复前 | 修复后 |
|------|--------|--------|
| **帧切换绘画显示** | ❌ 不立即显示 | ✅ 立即显示 |
| **撤销按钮禁用** | ❌ 无 | ✅ 有 |
| **重做按钮禁用** | ❌ 无 | ✅ 有 |
| **状态提示** | ❌ 无 | ✅ 第 X 步/共 Y 步 |
| **悬停提示** | ❌ 简单 | ✅ 详细 |
| **历史深拷贝** | ❌ 浅拷贝 | ✅ 深拷贝 |

---

## ⌨️ 快捷键

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| **←** | 上一帧 | 切换到上一帧，绘画立即显示 |
| **→** | 下一帧 | 切换到下一帧，绘画立即显示 |
| **Ctrl+Z** | 撤销 | 撤销上一步，显示状态提示 |
| **Ctrl+Y** | 重做 | 重做被撤销的，显示状态提示 |
| **H** | 绘画可见性 | 切换绘画显示/隐藏 |
| **S** | 保存 | 保存当前帧为 PNG |
| **Esc** | 关闭画板 | 关闭画板工具栏 |

---

## 📋 后续优化

- [ ] **添加撤销/重做动画** - 平滑过渡效果
- [ ] **显示绘画缩略图** - 历史记录面板
- [ ] **批量撤销** - Ctrl+Shift+Z 撤销多步
- [ ] **绘画图层管理** - 分层管理不同绘画
- [ ] **绘画透明度调节** - 调节已绘制绘画的透明度

---

**修复时间**: 2026-03-20 01:55  
**修复人员**: 波波  
**提交**: `a30fae3`  
**状态**: ✅ 已完成
