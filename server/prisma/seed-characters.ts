import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始创建种子数据...');

  // 1. 创建游戏
  const lol = await prisma.game.upsert({
    where: { name: '英雄联盟' },
    update: {},
    create: {
      name: '英雄联盟',
      description: '5v5 MOBA 游戏',
      published: true,
      order: 1,
    },
  });

  const genshin = await prisma.game.upsert({
    where: { name: '原神' },
    update: {},
    create: {
      name: '原神',
      description: '开放世界 RPG',
      published: true,
      order: 2,
    },
  });

  console.log('✅ 游戏创建完成');

  // 2. 创建动作
  const actionsData = [
    { name: '攻击', code: 'attack' },
    { name: '走位', code: 'walk' },
    { name: '技能', code: 'skill' },
    { name: '普攻', code: 'basic' },
    { name: '连招', code: 'combo' },
    { name: '闪避', code: 'dodge' },
    { name: '格挡', code: 'block' },
    { name: '嘲讽', code: 'taunt' },
    { name: '治疗', code: 'heal' },
    { name: '爆发', code: 'burst' },
    { name: '控制', code: 'control' },
    { name: '位移', code: 'dash' },
    { name: '隐身', code: 'stealth' },
    { name: '变身', code: 'transform' },
    { name: '大招', code: 'ultimate' },
    { name: '被动', code: 'passive' },
    { name: '回城', code: 'recall' },
    { name: '表情', code: 'emote' },
  ];

  const actions = [];
  for (const action of actionsData) {
    const a = await prisma.action.create({
      data: {
        ...action,
        published: true,
        order: actions.length,
      },
    });
    actions.push(a);
  }

  console.log(`✅ 动作创建完成 (${actions.length} 个)`);

  // 3. 创建角色（英雄联盟）
  const lolCharacters = [
    { name: '亚索', role: '战士' },
    { name: '阿狸', role: '法师' },
    { name: '劫', role: '刺客' },
    { name: '拉克丝', role: '法师' },
    { name: '锤石', role: '辅助' },
    { name: '盖伦', role: '战士' },
    { name: '金克丝', role: '射手' },
    { name: '李青', role: '刺客' },
  ];

  for (const charData of lolCharacters) {
    await prisma.character.upsert({
      where: {
        gameId_name: {
          name: charData.name,
          gameId: lol.id,
        }
      },
      update: {},
      create: {
        ...charData,
        gameId: lol.id,
        published: true,
        order: 0,
      },
    });
  }

  console.log(`✅ 英雄联盟角色创建完成 (${lolCharacters.length} 个)`);

  // 4. 创建角色（原神）
  const genshinCharacters = [
    { name: '迪卢克', role: '战士' },
    { name: '可莉', role: '法师' },
    { name: '刻晴', role: '刺客' },
    { name: '钟离', role: '坦克' },
    { name: '温迪', role: '辅助' },
    { name: '胡桃', role: '法师' },
    { name: '雷电将军', role: '战士' },
    { name: '纳西妲', role: '辅助' },
  ];

  for (const charData of genshinCharacters) {
    await prisma.character.upsert({
      where: {
        gameId_name: {
          name: charData.name,
          gameId: genshin.id,
        }
      },
      update: {},
      create: {
        ...charData,
        gameId: genshin.id,
        published: true,
        order: 0,
      },
    });
  }

  console.log(`✅ 原神角色创建完成 (${genshinCharacters.length} 个)`);

  // 5. 为角色绑定动作（示例：亚索的所有动作）
  const yasuo = await prisma.character.findFirst({
    where: { name: '亚索', gameId: lol.id },
  });

  if (yasuo) {
    // 找到对应的动作
    const attackAction = actions.find(a => a.code === 'attack');
    const walkAction = actions.find(a => a.code === 'walk');
    const comboAction = actions.find(a => a.code === 'combo');
    const ultimateAction = actions.find(a => a.code === 'ultimate');

    if (attackAction) {
      await prisma.characterAction.upsert({
        where: {
          characterId_actionId: {
            characterId: yasuo.id,
            actionId: attackAction.id,
          },
        },
        update: {},
        create: {
          characterId: yasuo.id,
          actionId: attackAction.id,
          published: true,
          order: 0,
        },
      });
    }

    if (walkAction) {
      await prisma.characterAction.upsert({
        where: {
          characterId_actionId: {
            characterId: yasuo.id,
            actionId: walkAction.id,
          },
        },
        update: {},
        create: {
          characterId: yasuo.id,
          actionId: walkAction.id,
          published: true,
          order: 1,
        },
      });
    }

    if (comboAction) {
      await prisma.characterAction.upsert({
        where: {
          characterId_actionId: {
            characterId: yasuo.id,
            actionId: comboAction.id,
          },
        },
        update: {},
        create: {
          characterId: yasuo.id,
          actionId: comboAction.id,
          published: true,
          order: 2,
        },
      });
    }

    if (ultimateAction) {
      await prisma.characterAction.upsert({
        where: {
          characterId_actionId: {
            characterId: yasuo.id,
            actionId: ultimateAction.id,
          },
        },
        update: {},
        create: {
          characterId: yasuo.id,
          actionId: ultimateAction.id,
          published: true,
          order: 3,
        },
      });
    }

    console.log('✅ 亚索动作绑定完成');
  }

  console.log('\n🎉 种子数据创建完成！');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据创建失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
