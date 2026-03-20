import { prisma } from '../lib/db.js';

async function initSettings() {
  try {
    const settings = [
      { key: 'siteName', value: 'CKAnim - 游戏动画参考', description: '网站名称' },
      { key: 'siteFooter', value: 'Powered by CKAnim', description: '页脚信息' },
      { key: 'siteNotice', value: '', description: '全站公告' },
    ];
    
    let created = 0;
    for (const setting of settings) {
      const exists = await prisma.siteSettings.findUnique({
        where: { key: setting.key },
      });
      
      if (!exists) {
        await prisma.siteSettings.create({ data: setting });
        created++;
        console.log(`✅ 创建：${setting.key}`);
      } else {
        console.log(`⏭️  已存在：${setting.key}`);
      }
    }
    
    console.log(`\n网站设置初始化完成，新建 ${created} 条记录`);
    process.exit(0);
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }
}

initSettings();
