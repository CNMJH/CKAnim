# CKAnim - 游戏动画参考网站

一个专业的游戏动画参考平台，提供各类游戏角色的动作视频参考，支持画板标注功能。

![Status](https://img.shields.io/badge/status-stable-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🌐 在线访问

- **前台网站**: https://video.jiangmeijixie.com
- **管理后台**: https://video.jiangmeijixie.com/admin

## 🚀 快速开始

### 开发环境

```bash
# 克隆项目
git clone https://github.com/CNMJH/CKAnim.git
cd CKAnim

# 安装依赖
npm install

# 启动所有服务（后端 + 前台 + 后台）
./restart-all-services.sh

# 访问
# 前台：http://localhost:5173
# 后台：http://localhost:3003
# API:  http://localhost:3002
```

### 生产环境

详见 [部署指南](docs/DEPLOYMENT.md)

```bash
# 使用 Docker Compose
docker-compose up -d

# 或使用 PM2
pm2 start ecosystem.config.js
```

## 📦 技术栈

### 前台网站
- **React 18.2** - 前端框架
- **React Router 6** - 路由管理
- **Vite 5.4** - 构建工具

### 管理后台
- **React 18.2** - 前端框架
- **React Query 5** - 数据获取
- **Vite 5.1** - 构建工具

### 后端 API
- **Fastify 4.26** - Node.js 框架
- **Prisma 5.22** - ORM
- **SQLite** - 数据库（开发环境）
- **TypeScript** - 类型安全

### 存储服务
- **七牛云** - 视频/图片存储（华南区域）

## 🎯 核心功能

### 前台网站

#### 🎮 游戏动画参考
- **游戏选择** - 按字母 A-Z 分类
- **角色选择** - 按职业/分类筛选
- **动作选择** - 攻击/走位/技能等分类
- **三级联动** - 游戏→角色→动作

#### 🎨 增强版视频播放器
- **画板功能** - 在视频上标注、绘画
- **画笔工具** - 单帧/全程两种模式
- **橡皮擦工具** - 圆形/方形，大小可调
- **文本工具** - 添加文字标注，支持旋转
- **逐帧控制** - 30fps 精确到帧
- **截图保存** - 合并视频帧 + 绘画导出 PNG
- **撤销/重做** - 完整历史记录

#### 🔍 搜索功能
- 关键词搜索
- 排序（相关性/播放量/最新）
- 结果网格展示

### 管理后台

#### 📊 内容管理
- **游戏管理** - 添加/编辑游戏
- **分类管理** - 管理角色分类
- **角色管理** - 添加角色，上传头像
- **动作管理** - 批量上传视频，卡片视图

#### ⚙️ 系统设置
- **网站设置** - 自定义网站名称、页脚
- **全站公告** - 首页提醒文字
- **数据同步** - 后台、数据库、七牛云三者同步

## 📁 项目结构

```
CKAnim/
├── src/                    # 前台源码
│   ├── components/         # 可复用组件
│   │   ├── VideoPlayerEnhanced.jsx  # 增强播放器
│   │   └── ...
│   ├── pages/              # 页面组件
│   │   ├── Games.jsx       # 游戏参考页
│   │   └── ...
│   └── ...
├── admin/                  # 管理后台源码
│   ├── src/
│   │   ├── pages/          # 管理页面
│   │   └── ...
│   └── ...
├── server/                 # 后端 API
│   ├── src/
│   │   ├── routes/         # API 路由
│   │   └── ...
│   └── ...
├── docs/                   # 文档
│   ├── DEPLOYMENT.md       # 部署指南
│   ├── video-player-enhancement-design.md
│   ├── video-player-user-guide.md
│   └── ...
├── restart-all-services.sh # 一键重启脚本
└── ecosystem.config.js     # PM2 配置
```

## 🔧 开发命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 重启所有服务
./restart-all-services.sh

# 查看服务状态
pm2 status
```

## 📚 核心文档

| 文档 | 说明 |
|------|------|
| [部署指南](docs/DEPLOYMENT.md) | 生产环境部署完整步骤 |
| [播放器设计](docs/video-player-enhancement-design.md) | 增强版播放器技术设计 |
| [用户指南](docs/video-player-user-guide.md) | 画板功能使用说明 |
| [数据同步](docs/data-sync-mechanism.md) | 三者数据同步机制 |
| [后台指南](docs/admin-guide.md) | 管理后台使用说明 |
| [批量上传](docs/batch-upload-guide.md) | 批量上传视频指南 |

## 🎨 画板功能

### 画笔工具
- **单帧模式** - 只在当前帧显示（红色徽章）
- **全程模式** - 类似水印，全程显示
- **颜色选择** - 自定义颜色
- **粗细调节** - 1-50px 滑条

### 橡皮擦工具
- **形状选择** - 圆形/方形（SVG 图标）
- **大小调节** - 10-100px 滑条
- **实时擦除** - 擦到哪擦到哪
- **路径分段** - 擦除中间保留两端

### 文本工具
- **点击输入** - 画布上直接输入
- **旋转角度** - 0-360° 自由旋转
- **编辑已有** - 点击已有文本修改

### 快捷键
- `Space` - 播放/暂停
- `←` / `→` - 上一帧/下一帧
- `B` - 切换画笔
- `E` - 切换橡皮擦
- `T` - 切换文本
- `Ctrl+Z` - 撤销
- `Ctrl+Y` - 重做
- `S` - 保存截图

## 📊 数据结构

### 内容层级
```
游戏 (Game)
  └── 分类 (GameCategory)
      └── 角色 (Character)
          └── 动作 (Action) = 视频 (Video)
```

### 绘画数据
```javascript
{
  id: 1234567890,
  type: 'single' | 'permanent',  // 单帧/全程
  frameIndex: 30,                // 帧索引
  tool: 'brush' | 'text',
  color: '#FF0000',
  size: 5,
  paths: [{ points: [{x, y}, ...] }],
  text: '标注文字',               // 文本工具
  position: { x, y },
  rotation: 45                    // 旋转角度
}
```

## 🐛 已知问题

暂无已知问题。

## 📝 更新日志

### 2026-03-20
- ✅ 橡皮擦实时擦除功能
- ✅ 橡皮擦路径分段算法
- ✅ 橡皮擦预览圈圈显示
- ✅ 画笔粗细滑条化
- ✅ 文本工具增强（点击输入、旋转）
- ✅ 所有按钮图标 SVG 化
- ✅ 倍速功能（6 档循环）
- ✅ 音量控制功能
- ✅ 角色头像上传功能

### 2026-03-19
- ✅ 增强版视频播放器上线
- ✅ 画板功能（画笔、橡皮擦、文本）
- ✅ 逐帧控制（30fps）
- ✅ 截图保存（PNG 格式）
- ✅ 撤销/重做功能
- ✅ 浏览器缓存修复（三层缓存）

### 2026-03-18
- ✅ 动作 - 视频 1 对 1 关系
- ✅ 层级筛选系统（游戏→角色→动作）
- ✅ 批量上传功能
- ✅ 七牛云存储集成

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**创建时间**: 2026-03-16  
**最后更新**: 2026-03-20  
**GitHub**: https://github.com/CNMJH/CKAnim  
**作者**: 阿米大王
