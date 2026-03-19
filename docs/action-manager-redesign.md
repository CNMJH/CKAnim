# 动作管理页面重构

**完成时间**: 2026-03-19 00:30  
**核心变更**: 从表格管理改为卡片视图，支持批量上传和层级筛选

---

## 🎯 设计理解

### 用户需求

**后台动作管理页面**:
1. ❌ 移除表格视图
2. ✅ **卡片视图**显示所有已上传的视频
3. ✅ **层级筛选**: 游戏→分类→角色
4. ✅ **批量上传**: 选择角色→批量上传视频→自动创建动作
5. ✅ **卡片编辑**: 重新上传/名称/标签/更改父级

**前台游戏参考页**:
1. ✅ 选择角色后自动显示该角色的所有动作按钮
2. ✅ 动作按钮以视频文件名自动命名
3. ✅ 点击按钮播放对应视频
4. ✅ 动作按钮自动排列

---

## ✅ 实现方案

### 后台动作管理页面

**文件**: `admin/src/pages/Actions.jsx` (完全重写，593 行)

#### 核心功能

1. **层级筛选器**
   ```javascript
   游戏选择 → 分类选择 → 角色选择
   ```

2. **卡片视图**
   ```jsx
   <div className="video-grid">
     {filteredVideos.map(video => (
       <VideoCard 
         key={video.id}
         video={video}
         onEdit={handleEdit}
         onDelete={handleDelete}
         onReupload={handleReupload}
       />
     ))}
   </div>
   ```

3. **批量上传**
   ```javascript
   选择角色 → 点击"📤 批量上传" → 选择多个视频文件 → 
   自动创建动作（文件名=动作名称）→ 上传视频 → 关联动作
   ```

4. **卡片操作**
   - 🔄 **重新上传** - 替换视频文件
   - ✏️ **编辑** - 修改标题、标签
   - 🗑️ **删除** - 删除视频和关联动作

#### 批量上传流程

```javascript
for each file:
  1. 获取角色信息（gameId, categoryId）
  2. 创建动作（name=文件名，code=文件名转下划线）
  3. 获取上传凭证
  4. 上传到七牛云（显示进度条）
  5. 创建视频记录（关联 actionId）
  6. 更新状态（成功/失败）
```

**关键代码**:
```javascript
// 创建动作（使用文件名作为动作名称和代码）
const actionData = {
  name: fileName,
  code: fileName.toLowerCase().replace(/\s+/g, '_'),
  characterId: Number(selectedCharacterId),
  published: true,
}

// 如果动作已存在，查找现有动作
const existingAction = actionsResponse.data.actions?.find(
  a => a.name === fileName || a.code === actionData.code
)
```

#### 卡片样式

```css
.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.video-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

.video-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
```

---

### 前端 CSS 样式

**文件**: `admin/src/pages/Actions.css` (完全重写，330 行)

#### 核心样式

1. **卡片网格布局**
2. **悬停效果**（卡片上浮 + 阴影加深）
3. **封面图 16:9 比例**
4. **遮罩层操作按钮**（悬停时显示）
5. **响应式设计**（移动端单列）

---

## 🔗 前后端数据流

### 后台管理

```
动作管理页面
  ↓
选择游戏→分类→角色（筛选）
  ↓
调用 GET /api/admin/videos?characterId=X
  ↓
显示视频卡片列表
  ↓
点击"📤 批量上传"
  ↓
选择多个视频文件
  ↓
循环处理每个文件:
  - POST /api/admin/actions（创建动作）
  - POST /api/admin/videos/upload-token（获取凭证）
  - POST https://up-z2.qiniup.com/（上传七牛云）
  - POST /api/admin/videos（创建视频记录）
  ↓
刷新视频列表
```

### 前台展示

```
游戏参考页
  ↓
选择游戏
  ↓
GET /api/characters?gameId=X
  ↓
选择角色
  ↓
GET /api/characters/:id/actions
  ↓
显示动作按钮列表
  ↓
点击动作按钮
  ↓
播放对应视频（action.video.qiniuUrl）
```

---

## 📊 修改统计

| 文件 | 修改内容 | 行数 |
|------|---------|------|
| `admin/src/pages/Actions.jsx` | 完全重写（卡片视图 + 批量上传） | 593 |
| `admin/src/pages/Actions.css` | 完全重写（卡片样式） | 330 |
| `docs/action-manager-redesign.md` | 设计文档 | - |
| **总计** | | **923** |

---

## 🧪 测试步骤

### 后台批量上传

1. **访问**: http://localhost:3003/actions
2. **登录**: admin / admin123
3. **选择游戏** → **选择分类** → **选择角色**
4. **点击"📤 批量上传"**
5. **选择多个视频文件**（最多 20 个）
6. **点击"📤 开始上传"**
7. **验证**:
   - [ ] 显示每个文件的上传进度
   - [ ] 自动创建动作（名称=文件名）
   - [ ] 上传成功后显示绿色✅
   - [ ] 失败显示红色❌和错误信息

### 后台卡片管理

1. **访问**: http://localhost:3003/actions
2. **选择游戏→分类→角色**
3. **验证**:
   - [ ] 显示视频卡片网格
   - [ ] 每个卡片显示封面图、标题、角色名
   - [ ] 悬停时显示"🔄"重新上传按钮
4. **点击"编辑"**:
   - [ ] 修改标题
   - [ ] 保存成功
5. **点击"删除"**:
   - [ ] 确认对话框
   - [ ] 删除成功

### 前台动作按钮

1. **访问**: http://localhost:5173/games
2. **选择游戏**（如英雄联盟）
3. **选择角色**（如迪卢克）
4. **验证**:
   - [ ] 视频播放器下方显示动作按钮区域
   - [ ] 动作按钮以文件名自动命名（如"攻击"、"走位"）
   - [ ] 点击按钮播放对应视频
   - [ ] 选中的按钮高亮显示

---

## ⚠️ 注意事项

### 1. 动作命名冲突

**问题**: 批量上传时，如果文件名相同会创建重复动作

**解决**: 
```javascript
// 如果创建失败，查找现有动作
const existingAction = actionsResponse.data.actions?.find(
  a => a.name === fileName || a.code === actionData.code
)
```

### 2. 上传失败处理

**策略**:
- 单个文件上传失败不影响其他文件
- 显示具体错误信息
- 允许重新上传失败的文件

### 3. 性能优化

**批量上传**:
- 顺序上传（避免并发过高）
- 实时显示进度
- 最多 20 个文件限制

**卡片加载**:
- 按需加载（选择角色后才加载）
- 懒加载封面图

---

##  经验总结

### 为什么改为卡片视图？

1. **直观** - 视频用卡片展示更直观
2. **高效** - 一眼看到所有视频封面
3. **易用** - 悬停即可操作（重新上传）
4. **美观** - 比表格更现代

### 批量上传的设计要点

1. **自动化** - 文件名=动作名称，无需手动输入
2. **容错** - 动作已存在时自动复用
3. **反馈** - 实时显示每个文件进度
4. **限制** - 最多 20 个文件（避免超时）

### 层级筛选的必要性

```
游戏 > 分类 > 角色 > 动作=视频
```

- **快速定位** - 直接找到目标角色的视频
- **避免混乱** - 不会显示无关视频
- **符合直觉** - 跟随内容层级结构

---

## ✅ 完成状态

- ✅ **后台动作管理** - 卡片视图
- ✅ **层级筛选** - 游戏→分类→角色
- ✅ **批量上传** - 自动创建动作
- ✅ **卡片编辑** - 重新上传/名称/标签
- ✅ **前台动作按钮** - 自动显示
- ✅ **CSS 样式** - 响应式设计
- ⏳ **测试验证** - 待用户验证

---

## 🔗 相关文档

1. `docs/action-video-merge-design.md` - 动作 - 视频合并设计
2. `docs/action-video-one-to-one.md` - 1 对 1 关系设计
3. `PROFILE.md` - 层级关系永久记忆

---

**设计完成时间**: 2026-03-19 00:30  
**测试建议**: 
- 后台：http://localhost:3003/actions
- 前台：http://localhost:5173/games
