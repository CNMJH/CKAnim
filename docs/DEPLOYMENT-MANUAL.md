# CKAnim 部署到阿里云 - 零基础手把手教程

> **适用对象**：完全不懂代码、不懂英文、不懂 Linux 的用户  
> **服务器**：阿里云 ECS（Alibaba Cloud Linux 3.2104 LTS）  
> **预计时间**：30-60 分钟（第一次操作）

---

## 📋 部署前准备

### 1.1 你需要准备的东西

| 物品 | 用途 | 是否必需 |
|------|------|----------|
| 阿里云账号 | 登录服务器 | ✅ 必需 |
| 七牛云账号 | 存储视频 | ✅ 必需 |
| 电脑 | Windows 或 Mac | ✅ 必需 |

### 1.2 获取七牛云配置（重要！）

**步骤 1**：登录七牛云 https://www.qiniu.com

**步骤 2**：获取 AccessKey 和 SecretKey
- 点击右上角头像 → **密钥管理**
- 复制 **AccessKey**（类似 `AbCdEfGhIjKlMnOpQrStUvWxYz123456`）
- 复制 **SecretKey**（类似 `1234567890AbCdEfGhIjKlMnOpQrStUvWx`）

**步骤 3**：获取储存空间名称
- 点击左侧 **对象存储**
- 找到你的储存空间（如 `zhuque-guangdong`）
- 复制 **储存空间名称**（不是域名！）

**步骤 4**：获取域名
- 点击你的储存空间
- 点击 **域名管理**
- 复制 **域名**（如 `https://video.jiangmeijixie.com`，要带 https://）

**⚠️ 重要**：把这 4 个信息记在纸上或记事本里！

---

## 2. 连接服务器

### 2.1 使用阿里云 Workbench（推荐）⭐

**步骤 1**：登录阿里云控制台 https://console.aliyun.com

**步骤 2**：点击左侧 **云服务器 ECS**

**步骤 3**：找到你的服务器（IP: 39.102.115.79）

**步骤 4**：点击 **远程连接** 或 **Workbench**

**步骤 5**：输入服务器密码

**步骤 6**：点击 **登录**

**成功的标志**：看到类似 `[root@iZxxx ~]#` 的提示符

### 2.2 如果通过 SSH 连接

**Windows 用户**：
1. 按 `Win + R`，输入 `cmd`，按回车
2. 输入：`ssh root@39.102.115.79`
3. 输入密码（不显示，正常）

**Mac 用户**：
1. 打开 Terminal
2. 输入：`ssh root@39.102.115.79`
3. 输入密码（不显示，正常）

---

## 3. 安装软件

**💡 提示**：以下命令都可以复制粘贴！

### 3.1 更新系统

```bash
yum update -y
```

**成功的标志**：出现 `Complete!`

### 3.2 安装 Node.js

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs
```

**成功的标志**：出现 `Complete!`

**验证**：
```bash
node -v
```
应该显示 `v20.x.x`

### 3.3 安装 Git

```bash
yum install -y git
```

**验证**：
```bash
git --version
```

### 3.4 安装 SQLite

```bash
yum install -y sqlite
```

### 3.5 安装 PM2

```bash
npm install -g pm2
pm2 -v
```

**成功的标志**：显示版本号如 `5.3.0`

### 3.6 安装 nano 编辑器

```bash
yum install -y nano
```

---

## 4. 下载网站代码

### 4.1 创建网站目录

```bash
mkdir -p /var/www/ckanim
cd /var/www/ckanim
```

### 4.2 下载代码

```bash
git clone https://github.com/CNMJH/CKAnim.git .
```

**⚠️ 注意**：命令最后有个点 `.` 不要漏掉！

### 4.3 检查下载结果

```bash
ls -la
```

**成功的标志**：看到 `src/`、`admin/`、`server/`、`package.json` 等文件

---

## 5. 配置网站

### 5.1 生成随机密钥

```bash
openssl rand -base64 32
```

**成功的标志**：显示一串类似 `xK9mL2nP5qR8sT1vW4yZ7aB0cD3eF6gH9iJ2kL5mN8o=` 的字符串

**⚠️ 重要**：复制这个字符串，后面要用！

### 5.2 编辑配置文件

```bash
nano ecosystem.config.js
```

**成功的标志**：打开配置文件编辑界面

### 5.3 修改配置内容

**找到并修改以下内容**（按 `Ctrl + W` 搜索关键词）：

#### 第 1 处：JWT_SECRET

**找到**：
```javascript
JWT_SECRET: '替换成你生成的随机字符串',
```

**改成**：
```javascript
JWT_SECRET: '粘贴你刚才生成的随机字符串',
```

#### 第 2 处：七牛云 AccessKey

**找到**：
```javascript
QINIU_ACCESS_KEY: '替换成你的 AccessKey',
```

**改成**：
```javascript
QINIU_ACCESS_KEY: '你的 AccessKey',
```

#### 第 3 处：七牛云 SecretKey

**找到**：
```javascript
QINIU_SECRET_KEY: '替换成你的 SecretKey',
```

**改成**：
```javascript
QINIU_SECRET_KEY: '你的 SecretKey',
```

#### 第 4 处：七牛云 Bucket

**找到**：
```javascript
QINIU_BUCKET: '替换成你的储存空间名称',
```

**改成**：
```javascript
QINIU_BUCKET: '你的储存空间名称',
```

#### 第 5 处：七牛云域名

**找到**：
```javascript
QINIU_DOMAIN: '替换成你的七牛云域名（带 https://）',
```

**改成**：
```javascript
QINIU_DOMAIN: '替换成你的七牛云域名（生产环境用 http://）',
```

### 5.4 修改后的示例

```javascript
env: {
  NODE_ENV: 'production',
  PORT: 3002,
  
  // JWT 配置
  JWT_SECRET: 'xK9mL2nP5qR8sT1vW4yZ7aB0cD3eF6gH9iJ2kL5mN8o=',
  JWT_EXPIRES_IN: '7d',
  
  // 七牛云配置
  QINIU_ACCESS_KEY: 'YOUR_ACCESS_KEY_HERE',
  QINIU_SECRET_KEY: 'YOUR_SECRET_KEY_HERE',
  QINIU_BUCKET: 'zhuque-guangdong',
  QINIU_DOMAIN: 'http://video.jiangmeijixie.com',
  QINIU_PREFIX: '参考网站 2026/',
  
  // 数据库配置
  DATABASE_URL: 'file:/var/www/ckanim/server/prisma/dev.db',
},
```

**⚠️ 重要提示**：
- `QINIU_BUCKET` 填储存空间名称（如 `zhuque-guangdong`），不是域名！
- `QINIU_DOMAIN` 生产环境用 `http://`（如 `http://video.jiangmeijixie.com`，自定义域名 HTTPS 证书无效）

### 5.5 保存并退出

**按 `Ctrl + O`** → **按回车** → **按 `Ctrl + X`**

**成功的标志**：回到命令行提示符

---

## 6. 安装依赖

### 6.1 安装主项目依赖

```bash
npm install
```

**需要时间**：5-10 分钟

**成功的标志**：出现 `added x packages`

### 6.2 安装管理后台依赖

```bash
cd admin
npm install
cd ..
```

### 6.3 安装后端依赖

```bash
cd server
npm install
cd ..
```

---

## 7. 初始化数据库

### 7.1 创建日志目录

```bash
mkdir -p logs
```

### 7.2 初始化数据库

```bash
cd server
npx prisma migrate dev --name init
cd ..
```

**成功的标志**：看到绿色文字 `✔ Generated Prisma Client`

### 7.3 创建管理员账户

```bash
cd server
npx tsx src/scripts/create-admin.ts
cd ..
```

**成功的标志**：看到 `管理员账户创建成功`

**默认管理员**：
- 用户名：`admin`
- 密码：`admin123`

---

## 8. 构建网站

### 8.1 构建前台

```bash
npm run build
```

### 8.2 构建后台

```bash
cd admin
npm run build
cd ..
```

**成功的标志**：出现 `✓ built in x.xx s`

---

## 9. 启动服务

### 9.1 启动所有服务

```bash
pm2 start ecosystem.config.js
```

**成功的标志**：看到 `all process started`

### 9.2 查看服务状态

```bash
pm2 status
```

**成功的标志**：看到 3 个服务都是 `online`：
- `ckanim-front` - 前台网站
- `ckanim-admin` - 管理后台
- `ckanim-server` - 后端 API

### 9.3 配置开机自启

```bash
pm2 save
pm2 startup
```

**如果有命令输出**，复制那行命令并执行。

---

## 10. 配置阿里云安全组

**⚠️ 这一步必须在浏览器里操作！**

### 10.1 登录阿里云控制台

打开浏览器：https://console.aliyun.com

### 10.2 找到安全组

1. 点击 **云服务器 ECS**
2. 点击你的服务器
3. 点击 **安全组**
4. 点击安全组 ID

### 10.3 添加端口规则

**添加 3 条规则**：

| 端口范围 | 授权对象 | 说明 |
|---------|---------|------|
| 5173/5173 | 0.0.0.0/0 | 前台网站 |
| 3002/3002 | 0.0.0.0/0 | 后端 API |
| 3003/3003 | 0.0.0.0/0 | 管理后台 |

**如何添加**：
1. 点击 **手动添加**
2. 端口范围：`5173/5173`
3. 授权对象：`0.0.0.0/0`
4. 优先级：`1`
5. 策略：**允许**
6. 点击 **保存**
7. 重复添加 3002 和 3003 端口

---

## 11. 关闭服务器防火墙（可选）

**⚠️ 如果第 10 步后网站仍无法访问，执行此步**

### 11.1 检查防火墙状态

```bash
systemctl status firewalld
```

### 11.2 关闭防火墙

```bash
systemctl stop firewalld
systemctl disable firewalld
```

**成功的标志**：出现 `Removed symlink`

---

## 12. 访问网站

### 12.1 前台网站

打开浏览器，访问：

```
http://39.102.115.79:5173
```

### 12.2 管理后台

打开浏览器，访问：

```
http://39.102.115.79:3003
```

**登录信息**：
- 用户名：`admin`
- 密码：`admin123`

---

## 13. 常见问题

### Q1: 网站打不开

**解决**：
1. 检查安全组端口是否开放
2. 检查服务状态：`pm2 status`
3. 重启服务：`pm2 restart all`
4. 关闭防火墙：`systemctl stop firewalld`

### Q2: 管理后台登录失败

**解决**：
1. 检查用户名密码是否正确
2. 重新创建管理员：
```bash
cd /var/www/ckanim/server
npx tsx src/scripts/create-admin.ts
```

### Q3: 七牛云视频无法上传

**解决**：
1. 检查七牛云配置是否正确
2. 检查 `QINIU_DOMAIN` 是否正确（生产环境用 `http://`）
3. 检查 `QINIU_BUCKET` 是否是储存空间名称（不是域名）
4. 查看后端日志：`pm2 logs ckanim-server`

### Q4: 服务状态不是 online

**解决**：
```bash
pm2 logs        # 查看错误日志
pm2 restart all # 重启所有服务
```

### Q5: 视频播放失败

**解决**：
1. 检查七牛云域名是否可访问
2. 检查视频文件是否存在
3. 查看浏览器控制台错误信息

---

## 📊 常用命令

| 命令 | 说明 |
|------|------|
| `pm2 status` | 查看服务状态 |
| `pm2 logs` | 查看日志 |
| `pm2 restart all` | 重启所有服务 |
| `pm2 stop all` | 停止所有服务 |
| `pm2 delete all` | 删除所有服务 |

---

## 🎉 部署完成！

**访问地址**：
- 前台网站：http://39.102.115.79:5173
- 管理后台：http://39.102.115.79:3003

**下一步**：
1. 登录管理后台
2. 创建游戏、分类、角色
3. 上传视频到七牛云
4. 在动作管理页面添加视频

---

**版本**: v6（修正版）  
**最后更新**: 2026-03-21  
**GitHub**: https://github.com/CNMJH/CKAnim
