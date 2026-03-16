// 游戏数据
export const games = [
  { id: 'albion', name: '阿尔比恩', letter: 'A' },
  { id: 'elden', name: '艾尔登法环', letter: 'A' },
  { id: 'd2', name: '暗黑 2', letter: 'A' },
  { id: 'd3', name: '暗黑 3', letter: 'A' },
  { id: 'd4', name: '暗黑 4', letter: 'A' },
  { id: 'baldur', name: '博德之门 3', letter: 'B' },
  { id: 'blackmyth', name: '黑神话', letter: 'H' },
  { id: 'lol', name: '英雄联盟', letter: 'Y' },
  { id: 'wow', name: '魔兽世界', letter: 'M' },
  { id: 'overwatch', name: '守望先锋', letter: 'S' },
];

// 角色数据
export const characters = [
  // 阿尔比恩角色
  { id: 'sword', name: '剑圣', role: '战士', game: 'albion' },
  { id: 'mage', name: '法师', role: '法师', game: 'albion' },
  { id: 'assassin', name: '刺客', role: '刺客', game: 'albion' },
  { id: 'tank', name: '坦克', role: '坦克', game: 'albion' },
  
  // 英雄联盟角色
  { id: 'yasuo', name: '亚索', role: '战士', game: 'lol' },
  { id: 'ahri', name: '阿狸', role: '法师', game: 'lol' },
  { id: 'zed', name: '劫', role: '刺客', game: 'lol' },
  { id: 'lux', name: '拉克丝', role: '法师', game: 'lol' },
  { id: 'thresh', name: '锤石', role: '辅助', game: 'lol' },
  
  // 魔兽世界角色
  { id: 'warrior', name: '战士', role: '战士', game: 'wow' },
  { id: 'paladin', name: '圣骑士', role: '坦克', game: 'wow' },
  { id: 'hunter', name: '猎人', role: '射手', game: 'wow' },
  { id: 'priest', name: '牧师', role: '辅助', game: 'wow' },
  
  // 黑神话角色
  { id: 'wukong', name: '悟空', role: '战士', game: 'blackmyth' },
  
  // 守望先锋角色
  { id: 'tracer', name: '猎空', role: '刺客', game: 'overwatch' },
  { id: 'mercy', name: '天使', role: '辅助', game: 'overwatch' },
  { id: 'rein', name: '莱因哈特', role: '坦克', game: 'overwatch' },
];

// 视频数据
export const videos = [
  {
    id: 1,
    title: '三连击教学 - 基础连招入门',
    game: 'lol',
    character: 'yasuo',
    type: 'attack',
    thumbnail: 'https://placehold.co/320x180/e0e0e0/999999?text=Video+1',
    duration: '05:32',
    views: 12340
  },
  {
    id: 2,
    title: '高端局走位技巧详解',
    game: 'lol',
    character: 'ahri',
    type: 'movement',
    thumbnail: 'https://placehold.co/320x180/e0e0e0/999999?text=Video+2',
    duration: '08:15',
    views: 8920
  },
  {
    id: 3,
    title: '刺客秒杀连招 - 手速训练',
    game: 'lol',
    character: 'zed',
    type: 'combo',
    thumbnail: 'https://placehold.co/320x180/e0e0e0/999999?text=Video+3',
    duration: '06:48',
    views: 15670
  },
  {
    id: 4,
    title: '法师技能命中率提升指南',
    game: 'lol',
    character: 'lux',
    type: 'skill',
    thumbnail: 'https://placehold.co/320x180/e0e0e0/999999?text=Video+4',
    duration: '10:22',
    views: 6540
  },
  {
    id: 5,
    title: '辅助钩子精准度练习',
    game: 'lol',
    character: 'thresh',
    type: 'skill',
    thumbnail: 'https://placehold.co/320x180/e0e0e0/999999?text=Video+5',
    duration: '07:30',
    views: 9230
  },
  {
    id: 6,
    title: '剑圣 PVP 实战技巧',
    game: 'albion',
    character: 'sword',
    type: 'pvp',
    thumbnail: 'https://placehold.co/320x180/e0e0e0/999999?text=Video+6',
    duration: '12:45',
    views: 11200
  },
  {
    id: 7,
    title: '魔兽世界战士输出循环',
    game: 'wow',
    character: 'warrior',
    type: 'combo',
    thumbnail: 'https://placehold.co/320x180/e0e0e0/999999?text=Video+7',
    duration: '09:18',
    views: 7890
  },
  {
    id: 8,
    title: '黑神话悟空 Boss 战攻略',
    game: 'blackmyth',
    character: 'wukong',
    type: 'boss',
    thumbnail: 'https://placehold.co/320x180/e0e0e0/999999?text=Video+8',
    duration: '15:30',
    views: 25600
  },
  {
    id: 9,
    title: '猎空闪现技巧合集',
    game: 'overwatch',
    character: 'tracer',
    type: 'movement',
    thumbnail: 'https://placehold.co/320x180/e0e0e0/999999?text=Video+9',
    duration: '06:12',
    views: 8340
  },
  {
    id: 10,
    title: '天使站位与奶量控制',
    game: 'overwatch',
    character: 'mercy',
    type: 'skill',
    thumbnail: 'https://placehold.co/320x180/e0e0e0/999999?text=Video+10',
    duration: '08:45',
    views: 5670
  },
  {
    id: 11,
    title: '艾尔登法环 Boss 闪避教学',
    game: 'elden',
    character: 'warrior',
    type: 'dodge',
    thumbnail: 'https://placehold.co/320x180/e0e0e0/999999?text=Video+11',
    duration: '11:20',
    views: 18900
  },
  {
    id: 12,
    title: '暗黑 4 野蛮人build 推荐',
    game: 'd4',
    character: 'barbarian',
    type: 'build',
    thumbnail: 'https://placehold.co/320x180/e0e0e0/999999?text=Video+12',
    duration: '14:55',
    views: 13400
  },
  {
    id: 13,
    title: '博德之门 3 法术组合技',
    game: 'baldur',
    character: 'wizard',
    type: 'combo',
    thumbnail: 'https://placehold.co/320x180/e0e0e0/999999?text=Video+13',
    duration: '10:08',
    views: 9870
  },
  {
    id: 14,
    title: '暗黑 2 法师刷装备路线',
    game: 'd2',
    character: 'sorceress',
    type: 'farming',
    thumbnail: 'https://placehold.co/320x180/e0e0e0/999999?text=Video+14',
    duration: '16:30',
    views: 22100
  },
  {
    id: 15,
    title: '暗黑 3 巅峰等级速刷指南',
    game: 'd3',
    character: 'demonhunter',
    type: 'farming',
    thumbnail: 'https://placehold.co/320x180/e0e0e0/999999?text=Video+15',
    duration: '13:42',
    views: 10500
  },
  {
    id: 16,
    title: '莱因哈特盾击时机把握',
    game: 'overwatch',
    character: 'rein',
    type: 'skill',
    thumbnail: 'https://placehold.co/320x180/e0e0e0/999999?text=Video+16',
    duration: '07:55',
    views: 6230
  },
  {
    id: 17,
    title: '圣骑士坦克进阶技巧',
    game: 'wow',
    character: 'paladin',
    type: 'tank',
    thumbnail: 'https://placehold.co/320x180/e0e0e0/999999?text=Video+17',
    duration: '11:15',
    views: 7450
  },
  {
    id: 18,
    title: '牧师治疗优先级详解',
    game: 'wow',
    character: 'priest',
    type: 'heal',
    thumbnail: 'https://placehold.co/320x180/e0e0e0/999999?text=Video+18',
    duration: '09:50',
    views: 5890
  },
];

// 轮播图数据
export const banners = [
  { id: 1, title: '本周推荐：英雄联盟高端局集锦' },
  { id: 2, title: '新游速递：黑神话悟空全 Boss 攻略' },
  { id: 3, title: '经典回顾：暗黑 2 二十年纪念' },
];
