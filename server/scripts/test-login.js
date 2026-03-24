// 测试登录流程
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const username = 'contentadmin';
  const password = 'ContentAdmin@123';
  
  console.log('🔐 测试登录流程');
  console.log('用户名:', username);
  console.log('密码:', password);
  console.log();
  
  // 1. 查找管理员
  const admin = await prisma.admin.findUnique({
    where: { username }
  });
  
  if (!admin) {
    console.log('❌ 未找到管理员');
    return;
  }
  
  console.log('✅ 找到管理员:');
  console.log('  ID:', admin.id);
  console.log('  用户名:', admin.username);
  console.log('  角色:', admin.role);
  console.log();
  
  // 2. 验证密码
  const valid = await bcrypt.compare(password, admin.password);
  console.log('🔑 密码验证:', valid ? '✅ 成功' : '❌ 失败');
  console.log();
  
  if (valid) {
    console.log('🎉 登录成功！');
  } else {
    console.log('💔 密码错误');
    console.log();
    console.log('数据库密码哈希:', admin.password);
    console.log();
    
    // 测试其他可能的密码
    const tests = [
      'ContentAdmin@123',
      'contentadmin@123',
      'ContentAdmin123',
      'admin123',
    ];
    
    for (const test of tests) {
      const result = await bcrypt.compare(test, admin.password);
      console.log(`测试 "${test}":`, result ? '✅' : '❌');
    }
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
