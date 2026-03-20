# CKAnim 部署到阿里云服务器 - 零基础教程

> 📌 **重要提示**：本教程专为不懂代码的用户设计，每个步骤都有详细说明。
> 
> **服务器信息**：
> - 公网 IP：`39.102.115.79`
> - 系统：Alibaba Cloud Linux 3.2104 LTS
> - 配置：2 vCPU 2 GiB，3Mbps 带宽

---

## 📋 部署前准备

### 1.1 你需要准备的东西

| 物品 | 说明 | 是否必需 |
|------|------|----------|
| 阿里云账号 | 用于登录服务器 | ✅ 必需 |
| 七牛云账号 | 用于存储视频 | ✅ 必需 |
| 域名（可选） | 如 `ckanim.com` | ❌ 可选（可用 IP 访问） |

### 1.2 打开你的电脑终端

#### Windows 用户：
1. 按 `Win + R` 键
2. 输入 `cmd` 并按回车
3. 出现黑色窗口就是终端

#### Mac 用户：
1. 按 `Cmd + Space` 键
2. 输入 `Terminal` 并按回车
3. 出现白色窗口就是终端

---

## 🚀 第一步：连接服务器

### 2.1 使用 SSH 连接

在终端中输入以下命令（复制粘贴）：

```bash
ssh root@39.102.115.79
```

**会发生什么**：
- 第一次连接会问 `Are you sure you want to continue connecting?`
- 输入 `yes` 并按回车
- 然后会要求输入密码

### 2.2 输入密码

- 输入你的服务器密码（**输入时不会显示，正常现象**）
- 按回车
- 看到类似 `[root@iZxxx ~]#` 的提示符，说明连接成功！

### 2.3 如果连接失败

**问题 1：连接被拒绝**
```
解决方案：登录阿里云控制台 → 云服务器 ECS → 安全组 → 添加规则 → 端口 22 → 允许所有 IP
```

**问题 2：密码错误**
```
解决方案：登录阿里云控制台 → 云服务器 ECS → 重置实例密码 → 重启服务器
```

---

## 📦 第二步：安装必要软件

### 3.1 更新系统软件

连接成功后，输入以下命令（每次输入后按回车）：

```bash
yum update -y
```

**说明**：这条命令是更新系统软件，可能需要 2-5 分钟，等待出现 `Complete!` 字样。

### 3.2 安装 Node.js（运行网站必需）

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
```

**说明**：这条命令是下载 Node.js 安装脚本，会看到很多滚动文字，等待完成。

```bash
yum install -y nodejs
```

**说明**：安装 Node.js，等待出现 `Complete!`。

```bash
node -v
```

**说明**：检查 Node.js 是否安装成功，应该显示 `v20.x.x`。

### 3.3 安装 Git（下载代码必需）

```bash
yum install -y git
```

**说明**：安装 Git，等待完成。

```bash
git --version
```

**说明**：检查 Git 版本，应该显示 `git version 2.x.x`。

### 3.4 安装 PM2（让网站持续运行）

```bash
npm install -g pm2
```

**说明**：安装 PM2 进程管理器，等待出现 `added x packages`。

```bash
pm2 -v
```

**说明**：检查 PM2 版本，应该显示数字如 `5.3.0`。

---

## 🗄️ 第三步：安装数据库

### 4.1 安装 SQLite

```bash
yum install -y sqlite
```

**说明**：安装 SQLite 数据库。

### 4.2 验证安装

```bash
sqlite3 --version
```

**说明**：应该显示版本号如 `3.34.1`。

---

## 📥 第四步：下载网站代码

### 5.1 创建网站目录

```bash
mkdir -p /var/www/ckanim
cd /var/www/ckanim
```

**说明**：在 `/var/www/ckanim` 目录存放网站文件。

### 5.2 从 GitHub 下载代码

```bash
git clone https://github.com/CNMJH/CKAnim.git .
```

**说明**：下载 CKAnim 代码到当前目录（注意最后有个点 `.`）。

### 5.3 检查下载结果

```bash
ls -la
```

**说明**：应该看到很多文件和文件夹，包括 `src/`、`admin/`、`server/`、`package.json` 等。

---

## ⚙️ 第五步：配置网站

### 6.1 创建环境配置文件

```bash
cp .env.production.example .env.production
```

**说明**：复制配置文件模板。

### 6.2 编辑配置文件

```bash
vi .env.production
```

**说明**：这会打开一个文本编辑器。

**如何编辑**：
1. 按 `i` 键进入编辑模式（屏幕底部会出现 `-- INSERT --`）
2. 使用方向键移动光标
3. 修改以下配置：

```
# 数据库路径（不需要改）
DATABASE_URL="file:/var/www/ckanim/server/prisma/dev.db"

# 七牛云配置（需要改成你的）
QINIU_ACCESS_KEY="你的七牛云 AccessKey"
QINIU_SECRET_KEY="你的七牛云 SecretKey"
QINIU_BUCKET="你的七牛云储存空间名称"
QINIU_DOMAIN="video.jiangmeijixie.com"
QINIU_ZONE="zone_z2"

# 前台网站配置
FRONTEND_PORT=5173
FRONTEND_HOST=0.0.0.0

# 管理后台配置
ADMIN_PORT=3003
ADMIN_HOST=0.0.0.0

# 后端 API 配置
SERVER_PORT=3002
SERVER_HOST=0.0.0.0
```

**如何保存退出**：
1. 按 `Esc` 键退出编辑模式
2. 输入 `:wq` 并按回车（w=保存，q=退出）

### 6.3 如果不会用 vi 编辑器

**更简单的方法**：

```bash
cat > .env.production << 'EOF'
DATABASE_URL="file:/var/www/ckanim/server/prisma/dev.db"
QINIU_ACCESS_KEY="你的七牛云 AccessKey"
QINIU_SECRET_KEY="你的七牛云 SecretKey"
QINIU_BUCKET="你的七牛云储存空间名称"
QINIU_DOMAIN="video.jiangmeijixie.com"
QINIU_ZONE="zone_z2"
FRONTEND_PORT=5173
FRONTEND_HOST=0.0.0.0
ADMIN_PORT=3003
ADMIN_HOST=0.0.0.0
SERVER_PORT=3002
SERVER_HOST=0.0.0.0
EOF
```

**说明**：把上面命令中的 `"你的七牛云 AccessKey"` 等替换成你的真实配置，然后整条命令复制粘贴到终端。

---

## 📦 第六步：安装网站依赖

### 7.1 安装前台依赖

```bash
cd /var/www/ckanim
npm install
```

**说明**：安装前台网站需要的软件包，可能需要 3-10 分钟，等待出现 `added x packages`。

### 7.2 安装后台依赖

```bash
cd /var/www/ckanim/admin
npm install
```

**说明**：安装管理后台需要的软件包。

### 7.3 安装后端依赖

```bash
cd /var/www/ckanim/server
npm install
```

**说明**：安装后端 API 需要的软件包。

---

## 🗄️ 第七步：初始化数据库

### 8.1 进入服务器目录

```bash
cd /var/www/ckanim/server
```

### 8.2 创建数据库表

```bash
npx prisma migrate dev
```

**说明**：创建数据库表结构，可能需要 1-2 分钟。

**如果成功**：会看到 `✔ Generated Prisma Client` 等绿色文字。

### 8.3 创建管理员账号

```bash
cd /var/www/ckanim/server
npx tsx src/scripts/create-admin.ts
```

**说明**：创建默认管理员账号。

**默认账号**：
- 用户名：`admin`
- 密码：`admin123`

---

## 🌐 第八步：配置阿里云安全组

### 9.1 登录阿里云控制台

1. 打开浏览器访问：https://console.aliyun.com
2. 登录你的阿里云账号

### 9.2 找到安全组设置

1. 点击左侧菜单 **云服务器 ECS**
2. 点击 **实例**
3. 找到你的服务器（IP: 39.102.115.79）
4. 点击 **安全组** 标签
5. 点击安全组 ID

### 9.3 添加端口规则

点击 **手动添加**，添加以下规则：

| 端口范围 | 授权对象 | 说明 |
|---------|---------|------|
| 5173/5173 | 0.0.0.0/0 | 前台网站 |
| 3002/3002 | 0.0.0.0/0 | 后端 API |
| 3003/3003 | 0.0.0.0/0 | 管理后台 |

**如何添加**：
1. 点击 **手动添加**
2. 端口范围输入 `5173/5173`
3. 授权对象输入 `0.0.0.0/0`
4. 优先级输入 `1`
5. 策略选择 **允许**
6. 点击 **保存**
7. 重复以上步骤添加 3002 和 3003 端口

---

## ▶️ 第九步：启动网站服务

### 10.1 创建启动脚本

```bash
cat > /var/www/ckanim/start-all.sh << 'EOF'
#!/bin/bash

cd /var/www/ckanim

# 启动后端 API
pm2 start ecosystem.config.js --only server

# 等待 3 秒
sleep 3

# 启动前台网站
pm2 start ecosystem.config.js --only frontend

# 启动管理后台
pm2 start ecosystem.config.js --only admin

echo "所有服务已启动！"
echo "前台网站：http://39.102.115.79:5173"
echo "管理后台：http://39.102.115.79:3003"
EOF
```

### 10.2 给脚本执行权限

```bash
chmod +x /var/www/ckanim/start-all.sh
```

### 10.3 启动所有服务

```bash
/var/www/ckanim/start-all.sh
```

**说明**：启动所有服务，应该看到 `all process started` 等字样。

### 10.4 检查服务状态

```bash
pm2 status
```

**说明**：应该看到 3 个服务都是 `online` 状态：
- `frontend` - 前台网站
- `admin` - 管理后台
- `server` - 后端 API

---

## ✅ 第十步：验证访问

### 11.1 访问前台网站

打开浏览器，访问：

```
http://39.102.115.79:5173
```

**应该看到**：CKAnim 网站首页

### 11.2 访问管理后台

打开浏览器，访问：

```
http://39.102.115.79:3003
```

**应该看到**：管理后台登录页面

**登录信息**：
- 用户名：`admin`
- 密码：`admin123`

### 11.3 如果无法访问

**问题 1：网站打不开**

```
解决方案：
1. 检查服务器安全组端口是否开放（见第九步）
2. 检查服务是否运行：pm2 status
3. 重启服务：pm2 restart all
```

**问题 2：管理后台登录失败**

```
解决方案：
1. 检查用户名密码是否正确
2. 重置密码：cd /var/www/ckanim/server && npx tsx src/scripts/reset-admin-password.ts
```

---

## 🔧 常用管理命令

### 查看所有服务状态

```bash
pm2 status
```

### 重启所有服务

```bash
pm2 restart all
```

### 查看服务日志

```bash
pm2 logs
```

### 停止所有服务

```bash
pm2 stop all
```

### 开机自动启动

```bash
pm2 startup
pm2 save
```

**说明**：执行后，服务器重启会自动启动网站。

---

## 📝 七牛云配置指南

### 12.1 注册七牛云账号

1. 访问：https://www.qiniu.com
2. 点击右上角 **注册**
3. 填写信息完成注册

### 12.2 创建储存空间

1. 登录后进入控制台
2. 点击左侧 **对象存储**
3. 点击 **创建储存空间**
4. 填写信息：
   - 储存空间名称：如 `ckanim-video`（必须英文）
   - 选择区域：选择 **华东** 或 **华北**（离北京近）
   - 访问控制：选择 **公开**
5. 点击 **确定**

### 12.3 获取密钥

1. 点击右上角头像 → **密钥管理**
2. 点击 **新增密钥**
3. 复制 **AccessKey** 和 **SecretKey**

### 12.4 配置域名

1. 进入储存空间 → **域名管理**
2. 复制 **测试域名**（如 `xxx.bkt.clouddn.com`）
3. 或绑定自己的域名

### 12.5 更新服务器配置

回到服务器，更新配置文件：

```bash
cat > /var/www/ckanim/.env.production << 'EOF'
DATABASE_URL="file:/var/www/ckanim/server/prisma/dev.db"
QINIU_ACCESS_KEY="你的 AccessKey"
QINIU_SECRET_KEY="你的 SecretKey"
QINIU_BUCKET="你的储存空间名称"
QINIU_DOMAIN="你的七牛云域名"
QINIU_ZONE="zone_z0"
FRONTEND_PORT=5173
FRONTEND_HOST=0.0.0.0
ADMIN_PORT=3003
ADMIN_HOST=0.0.0.0
SERVER_PORT=3002
SERVER_HOST=0.0.0.0
EOF
```

**注意**：
- 华东/华北区域用 `zone_z0`
- 华南区域用 `zone_z2`

### 12.6 重启服务

```bash
pm2 restart all
```

---

## 🆘 常见问题解答

### Q1: 连接服务器时提示"连接被拒绝"

**A**: 阿里云安全组没有开放 22 端口

**解决**：
1. 登录阿里云控制台
2. 云服务器 ECS → 安全组
3. 添加入方向规则：端口 22，授权对象 0.0.0.0/0

### Q2: 命令执行失败，提示"command not found"

**A**: 软件没有安装成功

**解决**：重新执行安装命令，确保看到 `Complete!` 或 `added x packages`

### Q3: 网站访问很慢

**A**: 服务器带宽只有 3Mbps，属于正常现象

**解决**：
- 视频建议使用七牛云存储（不占用服务器带宽）
- 考虑升级服务器带宽

### Q4: 服务运行一段时间后停止

**A**: PM2 没有配置开机自启

**解决**：
```bash
pm2 startup
pm2 save
```

### Q5: 数据库出错

**A**: 数据库文件损坏或权限问题

**解决**：
```bash
cd /var/www/ckanim/server
npx prisma migrate reset
```

**警告**：这会清空所有数据！

---

## 📞 需要帮助？

如果遇到问题：

1. **查看日志**：`pm2 logs`
2. **检查服务状态**：`pm2 status`
3. **重启服务**：`pm2 restart all`
4. **联系技术支持**：提供错误截图和日志

---

## 🎉 部署完成！

现在你的 CKAnim 网站已经运行在阿里云服务器上了！

**访问地址**：
- 前台网站：http://39.102.115.79:5173
- 管理后台：http://39.102.115.79:3003

**下一步**：
1. 登录管理后台
2. 创建游戏、分类、角色
3. 上传视频到七牛云
4. 在动作管理页面添加视频

祝你使用愉快！🎊
