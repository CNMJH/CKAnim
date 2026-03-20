# 文本工具增强功能

## 📋 概述

增强了视频播放器的文本工具，参考常规截图软件（如 Snipaste、微信截图）的文字功能，提供更直观的文本添加和编辑体验。

**提交**: `2f8c476`  
**日期**: 2026-03-20  
**文件**: `src/components/VideoPlayerEnhanced.jsx`, `src/components/VideoPlayerEnhanced.css`

---

## ✨ 新功能

### 1. 点击任意位置输入文字

**操作方式**:
1. 点击"画板"按钮开启工具栏
2. 选择文本工具（T 图标）
3. **点击画布任意位置**
4. 弹出文本输入框
5. 输入文字
6. 按 `Ctrl+Enter` 确认 或 `Esc` 取消

**之前**: 使用 `prompt()` 弹窗输入，无法预览效果  
**现在**: 直接在画布上显示输入框，实时预览文字样式

---

### 2. 文字旋转功能

**操作方式**:
1. 文本输入框下方显示旋转滑条
2. 拖动滑条调整角度（0-360°）
3. 实时显示当前角度值
4. 确认后文字按设定角度旋转

**UI 设计**:
- 旋转滑条：60px 宽度，蓝色滑块
- 角度显示：右侧显示 `XX°` 数值
- 实时预览：输入框内文字同步旋转

---

### 3. 编辑已有文本

**操作方式**:
1. 选择文本工具
2. **点击画布上已有的文字**
3. 弹出编辑框，显示原文字内容
4. 修改文字、颜色、大小、旋转角度
5. 确认后更新文本

**碰撞检测**:
- 自动检测点击位置是否有文字
- 文字范围：`position.x` 到 `position.x + 文字宽度`
- 文字高度：`字号 * 3`

---

### 4. 文字样式跟随画笔设置

**同步属性**:
- **颜色**: 使用画笔颜色选择器
- **大小**: 使用画笔粗细滑条（1-50px，渲染时 ×3）
- **实时预览**: 输入框内文字样式与最终效果一致

---

## 🎨 UI 设计

### 文本输入框

```
┌─────────────────────────────────┐
│ ┌─────────────────────────────┐ │
│ │ 输入文字...                 │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│          ✓  ✕  ━━━━━━ 45°      │
└─────────────────────────────────┘
```

**样式**:
- 背景：半透明黑色 `rgba(0, 0, 0, 0.8)`
- 边框：蓝色 `2px solid #007AFF`
- 圆角：`8px`
- 阴影：`0 4px 12px rgba(0, 0, 0, 0.5)`
- 最小宽度：`200px`

### 输入框内部

**Textarea**:
- 背景：`rgba(255, 255, 255, 0.95)`
- 边框：`1px solid rgba(255, 255, 255, 0.5)`
- 聚焦边框：`#007AFF`
- 字体：`Arial, bold, 字号 × 3`
- 颜色：跟随画笔颜色
- 可调整大小：`resize: both`

**控制按钮**:
- 确认按钮：蓝色 `✓`（28×28px）
- 取消按钮：红色 `✕`（28×28px）
- 旋转滑条：60px 宽度
- 角度值：等宽字体显示

---

## 🔧 技术实现

### 新增状态

```jsx
// 文本编辑状态
const [isEditingText, setIsEditingText] = useState(false);
const [editingText, setEditingText] = useState('');
const [editingPos, setEditingPos] = useState({ x: 0, y: 0 });
const [textRotation, setTextRotation] = useState(0); // 文字旋转角度
const [selectedDrawing, setSelectedDrawing] = useState(null); // 当前选中的绘画
```

### 文本渲染（支持旋转）

```jsx
const renderDrawing = (ctx, drawing) => {
  if (drawing.tool === 'text' && drawing.text) {
    ctx.save(); // 保存当前状态
    
    // 移动到文字位置
    ctx.translate(drawing.position.x, drawing.position.y);
    
    // 旋转
    if (drawing.rotation) {
      ctx.rotate((drawing.rotation * Math.PI) / 180);
    }
    
    // 绘制文字
    ctx.font = `bold ${drawing.size * 3}px Arial`;
    ctx.fillStyle = drawing.color;
    ctx.textBaseline = 'top';
    ctx.fillText(drawing.text, 0, 0);
    
    ctx.restore(); // 恢复状态
  }
};
```

### 点击检测（编辑已有文本）

```jsx
const startDrawing = (e) => {
  const pos = getCanvasCoordinates(e);
  
  // 检测是否点击了已有文本
  if (currentTool === 'text' && !isEditingText) {
    const clickedText = drawings.find(d => {
      if (d.tool !== 'text' || !d.text) return false;
      
      // 简单的碰撞检测
      const textWidth = d.text.length * d.size * 2;
      const textHeight = d.size * 3;
      
      return pos.x >= d.position.x && 
             pos.x <= d.position.x + textWidth &&
             pos.y >= d.position.y && 
             pos.y <= d.position.y + textHeight;
    });
    
    if (clickedText) {
      editExistingText(clickedText);
      return;
    }
  }
  
  // ... 其他逻辑
};
```

### 文本确认/取消

```jsx
const confirmText = () => {
  if (!editingText.trim()) {
    setIsEditingText(false);
    return;
  }
  
  if (selectedDrawing) {
    // 更新已有文本
    updateExistingText();
  } else {
    // 创建新文本
    const newDrawing = {
      id: Date.now(),
      type: brushType,
      frameIndex: Math.floor(videoRef.current.currentTime * 30),
      tool: 'text',
      color: brushColor,
      size: brushSize,
      text: editingText,
      position: editingPos,
      rotation: textRotation,
      timestamp: Date.now()
    };
    
    const newDrawings = [...drawings, newDrawing];
    setDrawings(newDrawings);
    addToHistory(newDrawings);
    setIsEditingText(false);
  }
};

const cancelText = () => {
  setIsEditingText(false);
  setEditingText('');
};
```

---

## 🎯 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Enter` | 确认输入文字 |
| `Esc` | 取消输入文字 |

---

## 📊 对比之前

| 功能 | 之前 | 现在 |
|------|------|------|
| **输入方式** | ❌ `prompt()` 弹窗 | ✅ 画布上直接输入 |
| **实时预览** | ❌ 无 | ✅ 输入框内预览 |
| **文字旋转** | ❌ 无 | ✅ 0-360° 可调 |
| **编辑已有文本** | ❌ 不支持 | ✅ 点击即可编辑 |
| **样式调整** | ❌ 固定样式 | ✅ 跟随画笔设置 |
| **取消操作** | ❌ 只能确认 | ✅ `Esc` 取消 |
| **用户体验** | ❌ 割裂 | ✅ 流畅直观 |

---

## 🧪 测试方法

### 测试 1: 添加新文本

1. 访问 http://localhost:5173/games
2. 选择游戏 → 角色 → 动作
3. 点击"画板"开启工具栏
4. 点击文本工具（T 图标）
5. **点击画布任意位置**
6. ✅ **应该弹出文本输入框**
7. 输入文字"测试文字"
8. 拖动旋转滑条调整角度
9. 按 `Ctrl+Enter` 确认
10. ✅ **文字应该显示在点击位置，带旋转角度**

### 测试 2: 编辑已有文本

1. 在画布上已有文字
2. 选择文本工具
3. **点击已有文字**
4. ✅ **应该弹出编辑框，显示原文字**
5. 修改文字内容
6. 调整颜色、大小、旋转
7. 确认
8. ✅ **文字应该更新为新内容**

### 测试 3: 取消输入

1. 点击文本工具
2. 点击画布
3. 输入一些文字
4. 按 `Esc`
5. ✅ **输入框应该消失，不创建文字**

### 测试 4: 文字样式

1. 选择画笔颜色（如红色）
2. 调整画笔大小（如 15px）
3. 选择文本工具
4. 点击画布输入文字
5. ✅ **文字颜色应该是红色**
6. ✅ **文字大小应该与画笔大小匹配**

---

## 📝 CSS 样式

### 文本编辑器覆盖层

```css
.text-editor-overlay {
  position: absolute;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid #007AFF;
  border-radius: 8px;
  padding: 8px;
  min-width: 200px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}
```

### 文本输入框

```css
.text-editor-input {
  width: 100%;
  min-height: 60px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  padding: 8px;
  font-family: Arial, sans-serif;
  font-weight: bold;
  resize: both;
  overflow: auto;
  outline: none;
  margin-bottom: 8px;
}
```

### 控制按钮

```css
.text-editor-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: #007AFF;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
}

.text-editor-btn.cancel {
  background: #dc3545;
}
```

### 旋转滑条

```css
.text-rotation-slider {
  width: 60px;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.text-rotation-slider::-webkit-slider-thumb {
  width: 14px;
  height: 14px;
  background: #007AFF;
  border-radius: 50%;
}
```

---

## 🎯 使用场景

### 场景 1: 标注关键动作

1. 播放到关键帧
2. 开启画板
3. 选择文本工具
4. 点击动作位置
5. 输入"关键帧"
6. 旋转文字匹配动作方向

### 场景 2: 添加说明文字

1. 暂停在需要说明的画面
2. 点击画面空白处
3. 输入详细说明
4. 调整文字大小和颜色
5. 旋转到合适角度

### 场景 3: 修正错误文字

1. 发现文字有误
2. 选择文本工具
3. 点击错误文字
4. 修改内容
5. 确认更新

---

## 🔮 未来改进

### 可能的增强功能

1. **拖动文字位置**
   - 选中文字后拖动调整位置
   - 显示拖动辅助线

2. **文字背景**
   - 添加半透明背景框
   - 提高文字可读性

3. **字体选择**
   - 支持多种字体
   - 粗体/斜体/下划线

4. **文字对齐**
   - 左对齐/居中/右对齐
   - 垂直对齐选项

5. **多行文本**
   - 更好的段落控制
   - 行距调整

6. **文字动画**
   - 淡入淡出
   - 打字机效果

---

## 📊 代码统计

**修改文件**: 2 个
- `VideoPlayerEnhanced.jsx`: +230 行 -15 行
- `VideoPlayerEnhanced.css`: +43 行 -6 行

**新增功能**:
- 文本输入框 UI 组件
- 旋转滑条控制
- 点击检测逻辑
- 文本编辑/更新函数
- 旋转渲染逻辑

**总计**: +273 行 -21 行

---

## ✅ 总结

文本工具现在支持：
- ✅ 点击任意位置输入文字
- ✅ 实时预览文字样式
- ✅ 0-360° 旋转调整
- ✅ 编辑已有文本
- ✅ 快捷键支持（Ctrl+Enter, Esc）
- ✅ 文字样式跟随画笔设置

用户体验大幅提升，接近专业截图软件的文字功能！
