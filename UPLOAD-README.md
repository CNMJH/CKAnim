#  文件上传说明

**部署文件已准备好**:

1. `/tmp/ckanim-permission-deploy.tar.gz` (约 104KB)
   - 包含：admin/dist/ (管理后台构建产物)
   - 包含：server/scripts/update-admin-accounts.js (账户更新脚本)

2. `/home/tenbox/CKAnim/deploy-to-server.sh` (部署脚本)

---

## 🚀 快速部署步骤

### 步骤 1: 上传文件到服务器

**使用你喜欢的任何方式上传到服务器** `39.102.115.79`:

**选项 A - 使用 FTP/SFTP 客户端** (推荐):
1. 打开 FileZilla 或 WinSCP
2. 主机：`39.102.115.79`
3. 用户名：`root`
4. 密码：你的服务器密码
5. 上传这两个文件到 `/tmp/` 目录

**选项 B - 使用 scp 命令**:
```bash
scp /tmp/ckanim-permission-deploy.tar.gz root@39.102.115.79:/tmp/
scp /home/tenbox/CKAnim/deploy-to-server.sh root@39.102.115.79:/tmp/
```

**选项 C - 使用宝塔面板**:
1. 登录宝塔面板
2. 文件 → 上传
3. 上传到 `/tmp/` 目录

---

### 步骤 2: 登录服务器执行部署

```bash
# SSH 登录
ssh root@39.102.115.79

# 进入临时目录
cd /tmp

# 给脚本执行权限
chmod +x deploy-to-server.sh

# 执行部署
./deploy-to-server.sh
```

---

### 步骤 3: 测试验证

部署完成后，访问管理后台测试：

**内容管理员账号**:
- URL: http://39.102.115.79:3003
- 账号：`contentadmin`
- 密码：`ContentAdmin@123`

**系统管理员账号**:
- URL: http://39.102.115.79:3003
- 账号：`sysadmin`
- 密码：`SystemAdmin@123`

---

## 📋 预期效果

### contentadmin 登录后:
- ✅ 菜单：游戏管理、分类管理、角色管理、动作管理、头像审核、设置
- ❌ 无 VIP 套餐菜单
- ✅ 游戏管理页面：只能看，不能编辑
- ✅ 设置页面：无"初始化默认设置"按钮

### sysadmin 登录后:
- ✅ 所有菜单（包括 VIP 套餐）
- ✅ 游戏管理：可以新建/编辑/删除
- ✅ 设置页面：有"初始化默认设置"按钮和网站配置

---

## 💡 如果遇到问题

查看日志：
```bash
pm2 logs ckanim-admin
pm2 logs ckanim-server
```

重启服务：
```bash
pm2 restart all --update-env
```

查看服务状态：
```bash
pm2 status
```

---

**文件位置总结**:
- 打包文件：`/tmp/ckanim-permission-deploy.tar.gz`
- 部署脚本：`/home/tenbox/CKAnim/deploy-to-server.sh`
- 部署说明：`/home/tenbox/CKAnim/docs/MANUAL-DEPLOY-INSTRUCTIONS.md`
- 权限文档：`/home/tenbox/CKAnim/docs/PERMISSION-UPDATE-20260324.md`

阿米大王，文件都准备好了！你可以用 FTP 工具或者 scp 命令上传到服务器，然后执行部署脚本就可以了。需要我帮你做什么吗？😊
