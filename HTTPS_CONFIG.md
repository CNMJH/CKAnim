# CKAnim 域名与 HTTPS 配置

## 域名信息
- **主域名**: anick.cn
- **前台地址**: https://anick.cn（自动跳转 HTTPS）
- **后台地址**: https://admin.anick.cn（自动跳转 HTTPS）

## DNS 配置
| 记录类型 | 主机记录 | 记录值 | 说明 |
|---------|---------|--------|------|
| A | @ | 39.102.115.79 | 主域名 |
| A | www | 39.102.115.79 | www 子域名 |
| A | admin | 39.102.115.79 | 后台管理 |

## Nginx 配置
- **配置文件**: `/etc/nginx/conf.d/ckanim.conf`
- **HTTP 端口**: 80（自动跳转 HTTPS）
- **HTTPS 端口**: 443（SSL/TLS）

## SSL 证书
- **证书类型**: Let's Encrypt（免费）
- **证书数量**: 2 个
  1. **前台证书**: `/etc/letsencrypt/live/anick.cn/`
     - 覆盖域名：`anick.cn`、`www.anick.cn`
     - 到期时间：2026-06-23
  2. **后台证书**: `/etc/letsencrypt/live/admin.anick.cn/`
     - 覆盖域名：`admin.anick.cn`
     - 到期时间：2026-06-23
- **有效期**: 90 天（自动续期）
- **自动续期**: `certbot-renew.timer`（systemd 定时任务）

## 静态资源配置

### 图片存储
- **存储路径**: `/var/www/ckanim/public/`
- **访问 URL**: `https://anick.cn/static/`
- **目录结构**:
  ```
  public/
  ├── icons/
  │   ├── game/        # 游戏图标 (3 个)
  │   └── character/   # 角色头像 (11 个)
  └── covers/          # 视频封面 (91 个)
  ```
- **总大小**: 18MB

### Nginx 静态资源配置
```nginx
location /static/ {
    alias /var/www/ckanim/public/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### 图片迁移记录
- ✅ 游戏图标：从 `http://video.jiangmeijixie.com/` 迁移到 `https://anick.cn/static/icons/game/`
- ✅ 角色头像：从 `http://video.jiangmeijixie.com/` 迁移到 `https://anick.cn/static/icons/character/`
- ✅ 视频封面：从 `http://video.jiangmeijixie.com/` 迁移到 `https://anick.cn/static/covers/`

---

## 访问方式
| 服务 | HTTP | HTTPS |
|------|------|-------|
| 前台网站 | http://anick.cn → 自动跳转 | https://anick.cn ✅ |
| 前台网站 | http://www.anick.cn → 自动跳转 | https://www.anick.cn ✅ |
| 后台管理 | http://admin.anick.cn → 自动跳转 | https://admin.anick.cn ✅ |

## 安全配置
- TLS 1.2 + TLS 1.3
- HTTP/2 支持
- HSTS 强制 HTTPS（max-age=63072000，2 年）
- 现代加密套件（ECDHE-RSA-AES128-GCM-SHA256）

## 维护命令
```bash
# 手动续期证书
certbot renew --dry-run  # 测试续期
certbot renew            # 实际续期

# 查看证书状态
certbot certificates

# 重启 Nginx
systemctl reload nginx

# 查看 Nginx 状态
systemctl status nginx
```

## 配置日期
2026-03-25
