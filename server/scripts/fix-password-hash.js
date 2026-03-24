// 修复密码哈希（使用 bcrypt 替代 bcryptjs）
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 重新生成密码哈希（使用 bcrypt）...');
  
  const contentHash = await bcrypt.hash('ContentAdmin@123', 10);
  const systemHash = await bcrypt.hash('SystemAdmin@123', 10);
  
  await prisma.admin.update({
    where: { username: 'contentadmin' },
    data: { password: contentHash }
  });
  
  await prisma.admin.update({
    where: { username: 'sysadmin' },
    data: { password: systemHash }
  });
  
  console.log('✅ 密码已更新');
  
  // 验证
  const contentAdmin = await prisma.admin.findUnique({ where: { username: 'contentadmin' } });
  const test = await bcrypt.compare('ContentAdmin@123', contentAdmin.password);
  console.log('密码验证测试:', test ? '✅ 成功' : '❌ 失败');
  
  console.log('\n📊 当前账户:');
  const admins = await prisma.admin.findMany({
    select: { id: true, username: true, role: true }
  });
  console.log(JSON.stringify(admins, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
