# 视频替换功能调试指南

## 问题现象
- 批量上传视频：✅ 成功
- 替换视频功能：❌ 失败，401 bad token

## 已排除的原因
1. ❌ QINIU_PREFIX 配置问题（已测试，无关）
2. ❌ 上传端点问题（都是 https://up-z2.qiniup.com/）
3. ❌ FormData 构造问题（代码完全相同）
4. ❌ XMLHttpRequest 使用问题（代码完全相同）
5. ❌ token 生成逻辑问题（Node.js 测试成功）

## 可能的根本原因

### 假设 1: editingVideo.categories 数据不完整
前端从视频列表 API 获取的 `categories` 可能缺少必要字段，导致后端查询分类失败。

**验证方法**：
```javascript
// 在浏览器控制台执行
console.log('完整 video 对象:', editingVideo);
console.log('categories:', editingVideo.categories);
console.log('categoryIds:', editingVideo.categories?.map(c => c.id));
```

### 假设 2: 后端查询分类时返回空结果
虽然前端传了 `categoryIds: [1]`，但后端查询可能返回空数组（分类 ID 不存在或已删除）。

**验证方法**：
查看服务器日志中的 `[Upload Token] 查询分类:` 输出。

### 假设 3: categoryPath 生成逻辑有问题
后端从分类 ID 生成 `categoryPath` 时可能出错（如分类层级追溯失败）。

**验证方法**：
查看服务器日志中的 `[Upload Token] 生成的分类路径:` 输出。

### 假设 4: 浏览器环境问题
某些浏览器对 FormData 或 XMLHttpRequest 有特殊限制。

**验证方法**：
在浏览器控制台手动执行上传代码。

## 调试步骤

### 步骤 1: 检查后端日志
```bash
ssh ckanim-server "pm2 logs ckanim-server --lines 50 --nostream | grep 'Upload Token'"
```

关注以下日志：
- `[Upload Token] 请求参数:` - 确认接收到的参数
- `[Upload Token] 查询分类:` - 确认查询到的分类
- `[Upload Token] 生成的分类路径:` - 确认生成的路径
- `[Upload Token] 生成的文件 key:` - 确认生成的 key

### 步骤 2: 浏览器控制台测试
在替换视频时，打开浏览器控制台，查看：
- `[Video Replace] 替换视频调试信息:`
- `[Video Replace] 获取上传凭证成功:`
- `[Video Replace] 开始上传到七牛云:`

### 步骤 3: 手动测试上传
在浏览器控制台执行：
```javascript
// 1. 获取当前 token 和 key（从失败的请求中复制）
const token = "复制的 token";
const key = "复制的 key";
const file = document.querySelector('input[type="file"]').files[0];

// 2. 手动构造 FormData
const formData = new FormData();
formData.append('token', token);
formData.append('key', key);
formData.append('file', file);

// 3. 手动上传
const xhr = new XMLHttpRequest();
xhr.addEventListener('load', () => {
  console.log('状态码:', xhr.status);
  console.log('响应:', xhr.responseText);
});
xhr.addEventListener('error', () => {
  console.error('网络错误');
});
xhr.open('POST', 'https://up-z2.qiniup.com/');
xhr.send(formData);
```

## 下一步行动
1. 查看服务器日志，确认 categoryPath 是否正确生成
2. 如果 categoryPath 为空，检查分类 ID 1 是否存在
3. 如果 categoryPath 正确，手动测试浏览器上传
