# CKAnim - 游戏动画参考网站

一个专业的游戏动画参考平台，提供各类游戏角色的动作视频参考。

## 🚀 快速开始

```bash
cd CKAnim
npm install
npm run dev
```

访问：http://localhost:5173

## 📦 技术栈

- **React 18** - 前端框架
- **React Router 6** - 路由管理
- **Vite 5** - 构建工具

## 🎯 功能特性

### 首页
- 📺 轮播图展示（推荐内容/公告）
- 🎬 视频网格布局
- 🔄 换一批功能
- ▶️ 鼠标悬停预览

### 游戏参考
- 📚 游戏分类（按字母 A-Z）
- 👤 角色选择（按职业分类）
- 🎭 动作分类（攻击/走位/技能等）
- 🎮 三级联动选择系统

### 搜索功能
- 🔍 关键词搜索
- 📊 排序（相关性/播放量/最新）
- 📋 搜索结果网格

## 📁 项目结构

```
CKAnim/
├── src/
│   ├── components/          # 可复用组件
│   │   ├── Header.jsx       # 顶部导航
│   │   ├── VideoCard.jsx    # 视频卡片
│   │   └── *.css
│   ├── pages/               # 页面组件
│   │   ├── Home.jsx         # 首页
│   │   ├── Games.jsx        # 游戏参考
│   │   ├── Search.jsx       # 搜索结果
│   │   └── *.css
│   ├── data/                # 模拟数据
│   │   └── mockData.js
│   ├── App.jsx              # 主应用
│   └── main.jsx             # 入口
├── index.html
├── package.json
└── vite.config.js
```

## 🎨 页面说明

### 1. 首页 (`/`)
- 轮播图展示推荐内容
- 视频网格展示
- 右侧"换一批"按钮

### 2. 游戏参考 (`/games`)
- 左侧：游戏列表（按字母分类）
- 中间：视频播放器 + 动作选择
- 右侧：角色选择面板（按职业筛选）

### 3. 搜索结果 (`/search?q=关键词`)
- 搜索关键词展示
- 排序选项切换
- 视频结果网格

## 📊 数据结构

### 游戏数据
```js
{
  id: 'albion',
  name: '阿尔比恩',
  letter: 'A',
  cover: '封面图 URL'
}
```

### 角色数据
```js
{
  id: 'sword',
  name: '剑圣',
  role: '战士',
  cover: '封面图 URL'
}
```

### 视频数据
```js
{
  id: 1,
  title: '三连击教学',
  game: 'lol',
  character: 'yasuo',
  type: 'attack',
  thumbnail: '缩略图 URL',
  duration: '05:32',
  views: 12340
}
```

## 🔧 开发命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 📝 下一步计划

- [ ] 接入真实视频数据
- [ ] 视频播放功能
- [ ] 用户登录/收藏
- [ ] 视频上传功能
- [ ] 评论系统
- [ ] 响应式优化

---

**创建时间**: 2026-03-16  
**GitHub**: https://github.com/CNMJH/CKAnim
