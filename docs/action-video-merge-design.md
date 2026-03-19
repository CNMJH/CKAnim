# 动作与视频管理合并设计

**创建时间**: 2026-03-18 23:55  
**核心洞察**: 视频就是动作的演示，它们是完全绑定的 1 对 1 关系，不应该分开管理

---

## 🎯 问题诊断

### 旧设计的问题

**分离管理** ❌:
```
动作管理页面          视频管理页面
├── 创建动作          ├── 上传视频
├── 编辑动作          ├── 选择游戏
└── 删除动作          ├── 选择角色
                      ├── 选择动作  ← 问题：为什么要在这里选动作？
                      └── 删除视频
```

**核心矛盾**:
1. **动作和视频是 1 对 1 关系** - 每个动作只能有一个视频
2. **视频管理页面要选择动作** - 说明视频不属于自己，属于动作
3. **数据冗余** - 动作有 video 字段，视频有 actionId 字段
4. **操作割裂** - 创建动作和上传视频要在两个页面完成

### 用户的正确理解

> "批量上传视频时不应该选择'动作'，因为每一个视频就是一个'动作'。应该选择动作的父集'角色'，然后上传后再编辑视频名称，动作自动适配...不对！我们应该直接在'动作管理'页面进行视频上传，应该去掉'视频管理'这个分类，直接上传视频就好了！因为视频就是动作！它们是 1 对 1 的关系！"

**关键洞察**:
- 动作 = 元数据（名称、代码、描述）
- 视频 = 实际内容（MP4 文件）
- **动作 + 视频 = 完整的动作演示**

---

## ✅ 新设计方案

### 合并管理

**动作管理页面** ✅:
```
动作列表
├── 创建动作
├── 编辑动作
├── 上传视频（针对无视频的动作）
├── 替换视频（针对有视频的动作）
└── 删除动作（级联删除视频）
```

**删除视频管理页面**:
- 导航栏移除"视频管理"
- 所有视频操作在动作管理完成
- 视频管理页面可以保留用于批量操作（可选）

---

## 🛠️ 实现细节

### 前端修改

**文件**: `admin/src/pages/Actions.jsx`

#### 1. 新增状态变量

```javascript
// 视频上传相关状态
const [uploadingActionId, setUploadingActionId] = useState(null)
const [uploadProgress, setUploadProgress] = useState(0)
const [pendingVideoFile, setPendingVideoFile] = useState(null)
const [showUploadModal, setShowUploadModal] = useState(false)
const [uploadingAction, setUploadingAction] = useState(null)
```

#### 2. 新增上传视频 Mutation

```javascript
const uploadVideoMutation = useMutation({
  mutationFn: async ({ actionId, file, title }) => {
    setUploadingActionId(actionId)
    setUploadProgress(0)

    // 1. 获取动作信息（包含角色和游戏）
    const action = await actionsAPI.getById(actionId)
    const characterId = action.data.characterId
    const character = await charactersAPI.getById(characterId)
    const gameId = character.data.gameId

    // 2. 获取上传凭证
    const tokenResponse = await videosAPI.getUploadToken(file.name, gameId, [])
    const { token, key, url } = tokenResponse.data

    // 3. 上传到七牛云
    const formData = new FormData()
    formData.append('token', token)
    formData.append('key', key)
    formData.append('file', file)

    const xhr = new XMLHttpRequest()
    await new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100)
          setUploadProgress(percent)
        }
      })
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) resolve()
        else reject(new Error(`上传失败 (${xhr.status})`))
      })
      xhr.addEventListener('error', () => reject(new Error('网络错误')))
      xhr.open('POST', 'https://up-z2.qiniup.com/')
      xhr.send(formData)
    })

    // 4. 创建视频记录（关联动作）
    const videoData = {
      title: title || file.name.replace(/\.[^/.]+$/, ''),
      gameId: gameId,
      characterId: characterId,
      actionId: actionId,
      qiniuKey: key,
      qiniuUrl: url,
      published: true,
      generateCover: true,
    }

    await videosAPI.create(videoData)
    setUploadingActionId(null)
    return videoData
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['actions'])
    setShowUploadModal(false)
    setPendingVideoFile(null)
    setUploadingAction(null)
    alert('视频上传成功！')
  },
  onError: (error) => {
    setUploadingActionId(null)
    alert('上传失败：' + error.message)
  },
})
```

#### 3. 新增辅助函数

```javascript
// 打开上传视频弹窗
const handleOpenUpload = (action) => {
  setUploadingAction(action)
  setPendingVideoFile(null)
  setShowUploadModal(true)
}

// 处理视频文件选择
const handleVideoFileSelect = (e) => {
  const file = e.target.files[0]
  if (file) {
    setPendingVideoFile(file)
  }
}

// 开始上传视频
const handleStartUpload = () => {
  if (!pendingVideoFile || !uploadingAction) {
    alert('请选择视频文件！')
    return
  }

  uploadVideoMutation.mutate({
    actionId: uploadingAction.id,
    file: pendingVideoFile,
    title: pendingVideoFile.name.replace(/\.[^/.]+$/, ''),
  })
}
```

#### 4. 修改动作列表渲染

```jsx
<td className="actions">
  <button className="btn-sm btn-secondary" onClick={() => handleEdit(action)}>
    编辑
  </button>
  {action.video ? (
    <button
      className="btn-sm btn-secondary"
      onClick={() => handleOpenUpload(action)}
      title="替换视频"
    >
      替换视频
    </button>
  ) : (
    <button
      className="btn-sm btn-primary"
      onClick={() => handleOpenUpload(action)}
    >
      📤 上传视频
    </button>
  )}
  <button
    className="btn-sm btn-danger"
    onClick={() => deleteMutation.mutate(action.id)}
  >
    删除
  </button>
</td>
```

#### 5. 新增上传视频弹窗

```jsx
{/* 上传视频弹窗 */}
{showUploadModal && uploadingAction && (
  <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
      <h3>📤 上传视频到动作</h3>
      
      <div className="upload-info">
        <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>
          动作：{uploadingAction.name}
        </p>
        <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
          角色：{uploadingAction.character?.name} | 
          游戏：{uploadingAction.character?.game?.name}
        </p>
      </div>

      <div className="form-group">
        <label>选择视频文件 *</label>
        <input
          type="file"
          accept="video/mp4,video/webm"
          onChange={handleVideoFileSelect}
          className="form-control"
        />
        <small className="hint">支持 MP4、WebM 格式</small>
      </div>

      {pendingVideoFile && (
        <div className="file-info">
          <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>
            📁 {pendingVideoFile.name}
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
            💾 {(pendingVideoFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      )}

      {uploadingActionId === uploadingAction.id && (
        <div className="upload-progress">
          <div style={{ height: '8px', background: '#e0e0e0', borderRadius: '4px' }}>
            <div style={{
              width: `${uploadProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
              transition: 'width 0.3s'
            }} />
          </div>
          <p style={{ textAlign: 'center', marginTop: '8px', fontSize: '14px' }}>
            上传中... {uploadProgress}%
          </p>
        </div>
      )}

      <div className="modal-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setShowUploadModal(false)}
          disabled={uploadingActionId === uploadingAction.id}
        >
          取消
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleStartUpload}
          disabled={!pendingVideoFile || uploadingActionId === uploadingAction.id}
        >
          {uploadingActionId === uploadingAction.id ? '上传中...' : '📤 开始上传'}
        </button>
      </div>
    </div>
  </div>
)}
```

### 后端修改

**文件**: `server/src/routes/actions.ts`

#### 新增 getById 接口

```typescript
// 获取单个动作（包含角色和游戏信息）
server.get(
  '/actions/:id',
  { preHandler: [authenticate] },
  async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const actionId = parseInt(id);

      const action = await prisma.action.findUnique({
        where: { id: actionId },
        include: {
          character: {
            include: {
              game: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          video: true, // ⭐ 1 对 1 关系
        },
      });

      if (!action) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Action not found',
        });
      }

      reply.send(action);
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch action',
      });
    }
  }
);
```

**文件**: `server/src/routes/videos.ts`

#### 修改上传凭证接口

```typescript
server.post(
  '/videos/upload-token',
  { preHandler: [authenticate] },
  async (request, reply) => {
    try {
      const { filename, gameId, categoryIds = [], actionId } = request.body as {
        filename: string;
        gameId?: number;
        categoryIds?: number[];
        actionId?: number;
      };

      // 如果提供了 actionId，自动获取分类信息
      let finalCategoryIds = categoryIds;
      if (actionId && !categoryIds.length) {
        const action = await prisma.action.findUnique({
          where: { id: actionId },
          include: {
            character: {
              select: {
                categoryId: true,
              },
            },
          },
        });
        
        if (action && action.character?.categoryId) {
          finalCategoryIds = [action.character.categoryId];
        }
      }

      // ... 生成上传凭证
    }
  }
);
```

#### 修改创建视频接口

```typescript
server.post(
  '/videos',
  { preHandler: [authenticate] },
  async (request, reply) => {
    try {
      const {
        title,
        gameId,
        characterId,
        actionId,
        qiniuKey,
        qiniuUrl,
        categoryIds = [],
        // ...
      } = body;

      // 如果没有提供 categoryIds，但有 actionId，自动从动作→角色→分类获取
      let finalCategoryIds = categoryIds;
      if (categoryIds.length === 0 && actionId) {
        const actionForCategory = await tx.action.findUnique({
          where: { id: actionId },
          include: {
            character: {
              select: {
                categoryId: true,
              },
            },
          },
        });
        if (actionForCategory?.character?.categoryId) {
          finalCategoryIds = [actionForCategory.character.categoryId];
        }
      }

      // ... 创建视频记录
    }
  }
);
```

**文件**: `admin/src/lib/services.js`

#### 新增 API 函数

```javascript
export const charactersAPI = {
  // ...
  getById: (id) => api.get(`/admin/characters/${id}`),
}

export const actionsAPI = {
  // ...
  getById: (id) => api.get(`/admin/actions/${id}`),
}
```

---

## 📊 修改统计

| 文件 | 修改内容 | 行数 |
|------|---------|------|
| `admin/src/pages/Actions.jsx` | 新增视频上传功能 | +180 |
| `admin/src/lib/services.js` | 新增 getById 接口 | +2 |
| `server/src/routes/actions.ts` | 新增 getById 路由 | +50 |
| `server/src/routes/videos.ts` | 自动分类关联 | +30 |
| **总计** | | **+262** |

---

## 🧪 测试步骤

### 步骤 1: 访问动作管理
```
http://localhost:3003/actions
```

### 步骤 2: 创建动作（无视频）
1. 点击"➕ 新建动作"
2. 选择游戏→分类→角色
3. 填写名称、代码
4. 点击"保存"
5. **验证**: 动作列表中显示"❌ 无视频"

### 步骤 3: 上传视频到动作
1. 点击"📤 上传视频"按钮
2. **验证**: 弹窗显示动作信息（名称、角色、游戏）
3. 选择视频文件
4. 点击"📤 开始上传"
5. **验证**: 显示上传进度条
6. **验证**: 上传成功后动作列表显示"✅ 有视频"

### 步骤 4: 替换视频
1. 点击"替换视频"按钮（针对已有视频的动作）
2. 选择新视频文件
3. 点击"📤 开始上传"
4. **验证**: 旧视频被替换

### 步骤 5: 删除动作
1. 点击"删除"按钮
2. **验证**: 提示"确定要删除这个动作吗？（同时会删除关联的视频）"
3. 确认后删除
4. **验证**: 动作和视频都被删除

---

## ⚠️ 注意事项

### 1. 视频管理页面的去留

**方案 A: 完全删除** ✅
- 优点：清晰，避免混淆
- 缺点：失去批量上传功能

**方案 B: 保留用于批量操作** ⭐ 推荐
- 视频管理页面保留
- 仅用于批量上传、批量删除
- 单个视频操作在动作管理完成

### 2. 批量上传的改进

**当前问题**: 批量上传时无法批量创建动作

**解决方案**:
```
批量上传视频
├── 选择角色
├── 批量选择视频文件（20 个）
├── 自动创建动作（使用文件名作为动作名称）
└── 批量上传视频
```

### 3. 动作命名规范

**建议**:
- 动作名称使用中文（如"普通攻击"、"技能 1"）
- 动作代码使用英文（如"attack_basic"、"skill_1"）
- 视频文件使用动作代码命名（如"attack_basic.mp4"）

---

## 📝 经验总结

### 为什么之前设计错了？

1. **过度设计** - 把 1 对 1 关系当成多对多关系
2. **缺乏抽象** - 没有理解"动作 + 视频 = 完整动作演示"
3. **功能割裂** - 创建动作和上传视频在两个页面

### 如何避免再次发生？

1. **理解业务本质** - 动作和视频是不可分割的整体
2. **跟随用户直觉** - 用户说"视频就是动作"是对的
3. **简化设计** - 能合并的页面就合并

### 设计原则

```
1. 1 对 1 关系 → 合并管理
2. 1 对多关系 → 父子页面
3. 多对多关系 → 独立管理 + 关联表
```

---

## ✅ 完成状态

- ✅ **前端 Actions.jsx** - 新增视频上传功能
- ✅ **前端 services.js** - 新增 getById 接口
- ✅ **后端 actions.ts** - 新增 getById 路由
- ✅ **后端 videos.ts** - 自动分类关联
- ⏳ **测试验证** - 待用户验证
- ⏳ **批量上传改进** - 待实现

---

## 🔗 相关文档

1. `docs/action-video-one-to-one.md` - 动作 - 视频 1 对 1 设计
2. `docs/video-upload-hierarchy-fix.md` - 视频上传层级关系修复
3. `PROFILE.md` - 内容层级关系永久记忆

---

**设计完成时间**: 2026-03-18 23:55  
**测试建议**: 访问 http://localhost:3003/actions 测试上传视频功能
