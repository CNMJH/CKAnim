#!/bin/bash
# 直接在服务器上插入 VIP 限制配置

DB_PATH="/var/www/ckanim/server/prisma/dev.db"

echo "📊 插入 VIP 限制配置..."

sqlite3 "$DB_PATH" <<EOF
INSERT OR REPLACE INTO user_library_settings (key, value, description, updatedAt) 
VALUES (
  'vip_limits_free',
  '{"maxFileSize":0,"maxTotalSize":0,"description":"普通用户：不支持上传"}',
  '普通用户上传限制',
  datetime('now')
);

INSERT OR REPLACE INTO user_library_settings (key, value, description, updatedAt) 
VALUES (
  'vip_limits_vip_monthly',
  '{"maxFileSize":31457280,"maxTotalSize":524288000,"description":"VIP 月卡：单文件 30MB，总空间 500MB"}',
  'VIP 月卡上传限制',
  datetime('now')
);

INSERT OR REPLACE INTO user_library_settings (key, value, description, updatedAt) 
VALUES (
  'vip_limits_vip_yearly',
  '{"maxFileSize":104857600,"maxTotalSize":10737418240,"description":"VIP 年卡：单文件 100MB，总空间 10GB"}',
  'VIP 年卡上传限制',
  datetime('now')
);

INSERT OR REPLACE INTO user_library_settings (key, value, description, updatedAt) 
VALUES (
  'vip_limits_vip_lifetime',
  '{"maxFileSize":209715200,"maxTotalSize":53687091200,"description":"永久 SVIP：单文件 200MB，总空间 50GB"}',
  '永久 SVIP 上传限制',
  datetime('now')
);

SELECT '✅ 配置插入成功！' as status;
SELECT key, description FROM user_library_settings WHERE key LIKE 'vip_limits_%';
EOF

echo ""
echo "✨ VIP 限制配置完成！"
