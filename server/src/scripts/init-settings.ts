import { prisma } from '../lib/db.js';

async function initSettings() {
  try {
    const result = await prisma.siteSettings.createMany({
      data: [
        { key: 'siteName', value: 'CKAnim - 游戏动画参考', description: '网站名称' },
        { key: 'siteFooter', value: 'Powered by CKAnim', description: '页脚信息' },
        { key: 'siteNotice', value: '', description: '全站公告' },
      ],
      skipDuplicates: true,
    });
    console.log('✅ 网站设置初始化完成，创建/跳过', result.count, '条记录');
    process.exit(0);
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }
}

initSettings();
