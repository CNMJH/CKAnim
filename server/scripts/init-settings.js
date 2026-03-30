/**
 * 初始化个人参考库 VIP 限制配置（ES Module 版本）
 * 用法：node server/scripts/init-settings.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:/home/tenbox/CKAnim/server/prisma/dev.db',
    },
  },
});

const DEFAULT_SETTINGS = [
  {
    key: 'vip_limits_free',
    value: JSON.stringify({
      maxFileSize: 0,
      maxTotalSize: 0,
      description: '普通用户：不支持上传'
    }),
    description: '普通用户上传限制'
  },
  {
    key: 'vip_limits_vip_monthly',
    value: JSON.stringify({
      maxFileSize: 30 * 1024 * 1024,
      maxTotalSize: 500 * 1024 * 1024,
      description: 'VIP 月卡：单文件 30MB，总空间 500MB'
    }),
    description: 'VIP 月卡上传限制'
  },
  {
    key: 'vip_limits_vip_yearly',
    value: JSON.stringify({
      maxFileSize: 100 * 1024 * 1024,
      maxTotalSize: 10 * 1024 * 1024 * 1024,
      description: 'VIP 年卡：单文件 100MB，总空间 10GB'
    }),
    description: 'VIP 年卡上传限制'
  },
  {
    key: 'vip_limits_vip_lifetime',
    value: JSON.stringify({
      maxFileSize: 200 * 1024 * 1024,
      maxTotalSize: 50 * 1024 * 1024 * 1024,
      description: '永久 SVIP：单文件 200MB，总空间 50GB'
    }),
    description: '永久 SVIP 上传限制'
  },
];

async function main() {
  console.log('🚀 开始初始化个人参考库 VIP 限制配置...\n');

  for (const setting of DEFAULT_SETTINGS) {
    try {
      const created = await prisma.userLibrarySettings.upsert({
        where: { key: setting.key },
        create: setting,
        update: setting,
      });
      console.log(`✅ ${setting.description}: ${setting.key}`);
    } catch (error) {
      console.error(`❌ 失败 ${setting.description}: ${error.message}`);
    }
  }

  console.log('\n✨ 初始化完成！\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
