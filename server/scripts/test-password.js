// 测试密码验证
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const contentAdmin = await prisma.admin.findUnique({ 
    where: { username: 'contentadmin' },
    select: { id: true, username: true, password: true, role: true }
  });
  
  console.log('📊 数据库中的密码哈希:');
  console.log(contentAdmin.password);
  console.log();
  
  const test1 = await bcrypt.compare('ContentAdmin@123', contentAdmin.password);
  console.log('✅ 测试 "ContentAdmin@123":', test1 ? '成功 ✓' : '失败 ✗');
  
  const test2 = await bcrypt.compare('SystemAdmin@123', contentAdmin.password);
  console.log('✅ 测试 "SystemAdmin@123":', test2 ? '成功 ✓' : '失败 ✗');
  
  await prisma.$disconnect();
}

main().catch(console.error);
