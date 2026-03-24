// 更新管理员账户脚本
// 删除旧 admin 账户，创建 content_admin 和 system_admin

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  
  // 1. 删除旧的 admin 账户
  console.log('🗑️  删除旧的 admin 账户...');
  await prisma.admin.deleteMany({
    where: { role: 'admin' }
  });
  console.log('✅ 已删除 admin 角色账户');
  
  // 2. 创建 content_admin 账户
  const contentAdminPassword = bcrypt.hashSync('ContentAdmin@123', 10);
  console.log('📝 创建 content_admin 账户...');
  await prisma.admin.upsert({
    where: { username: 'contentadmin' },
    update: {
      password: contentAdminPassword,
      email: 'contentadmin@ckanim.com',
      role: 'content_admin'
    },
    create: {
      username: 'contentadmin',
      password: contentAdminPassword,
      email: 'contentadmin@ckanim.com',
      role: 'content_admin',
      createdAt: now,
      updatedAt: now
    }
  });
  console.log('✅ content_admin 账户已创建');
  
  // 3. 创建 system_admin 账户
  const systemAdminPassword = bcrypt.hashSync('SystemAdmin@123', 10);
  console.log('📝 创建 system_admin 账户...');
  await prisma.admin.upsert({
    where: { username: 'sysadmin' },
    update: {
      password: systemAdminPassword,
      email: 'sysadmin@ckanim.com',
      role: 'system_admin'
    },
    create: {
      username: 'sysadmin',
      password: systemAdminPassword,
      email: 'sysadmin@ckanim.com',
      role: 'system_admin',
      createdAt: now,
      updatedAt: now
    }
  });
  console.log('✅ system_admin 账户已创建');
  
  // 4. 验证结果
  const admins = await prisma.admin.findMany({
    select: { id: true, username: true, email: true, role: true }
  });
  
  console.log('\n📊 当前管理员账户列表:');
  console.log(JSON.stringify(admins, null, 2));
  
  console.log('\n✅ 账户更新完成！');
  console.log('\n登录信息:');
  console.log('  内容管理员：contentadmin / ContentAdmin@123');
  console.log('  系统管理员：sysadmin / SystemAdmin@123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
