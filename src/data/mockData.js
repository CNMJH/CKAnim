// 游戏数据（按字母分类）
export const games = [
  {
    id: 'albion',
    name: '阿尔比恩',
    letter: 'A',
    cover: 'https://via.placeholder.com/120x120/DC3545/FFFFFF?text=阿尔比恩'
  },
  {
    id: 'elden',
    name: '艾尔登法环',
    letter: 'A',
    cover: 'https://via.placeholder.com/120x120/6c757d/FFFFFF?text=艾尔登'
  },
  {
    id: 'diablo2',
    name: '暗黑破坏神 2',
    letter: 'A',
    cover: 'https://via.placeholder.com/120x120/6c757d/FFFFFF?text=暗黑 2'
  },
  {
    id: 'diablo3',
    name: '暗黑破坏神 3',
    letter: 'A',
    cover: 'https://via.placeholder.com/120x120/6c757d/FFFFFF?text=暗黑 3'
  },
  {
    id: 'baldur3',
    name: '博德之门 3',
    letter: 'B',
    cover: 'https://via.placeholder.com/120x120/6c757d/FFFFFF?text=博德 3'
  },
  {
    id: 'shadow',
    name: '影之刃',
    letter: 'C',
    cover: 'https://via.placeholder.com/120x120/6c757d/FFFFFF?text=影之刃'
  },
  {
    id: 'lol',
    name: '英雄联盟',
    letter: 'C',
    cover: 'https://via.placeholder.com/120x120/6c757d/FFFFFF?text=LOL'
  },
  {
    id: 'overwatch',
    name: '幽灵狙击手',
    letter: 'C',
    cover: 'https://via.placeholder.com/120x120/6c757d/FFFFFF?text=狙击手'
  },
  {
    id: 'dnd',
    name: '勇者斗恶龙',
    letter: 'C',
    cover: 'https://via.placeholder.com/120x120/6c757d/FFFFFF?text=DQ'
  },
  {
    id: 'ac',
    name: '刺客信条',
    letter: 'C',
    cover: 'https://via.placeholder.com/120x120/6c757d/FFFFFF?text=AC'
  }
];

// 角色数据（按职业分类）
export const characters = {
  albion: [
    { id: 'sword', name: '剑圣', role: '战士', cover: 'https://via.placeholder.com/100x100/DC3545/FFFFFF?text=剑圣' },
    { id: 'mage', name: '法师', role: '法师', cover: 'https://via.placeholder.com/100x100/6c757d/FFFFFF?text=法师' },
    { id: 'assassin', name: '刺客', role: '刺客', cover: 'https://via.placeholder.com/100x100/6c757d/FFFFFF?text=刺客' },
    { id: 'tank', name: '坦克', role: '坦克', cover: 'https://via.placeholder.com/100x100/6c757d/FFFFFF?text=坦克' },
  ],
  lol: [
    { id: 'yasuo', name: '亚索', role: '战士', cover: 'https://via.placeholder.com/100x100/007bff/FFFFFF?text=亚索' },
    { id: 'ahri', name: '阿狸', role: '法师', cover: 'https://via.placeholder.com/100x100/6c757d/FFFFFF?text=阿狸' },
    { id: 'zed', name: '劫', role: '刺客', cover: 'https://via.placeholder.com/100x100/6c757d/FFFFFF?text=劫' },
  ]
};

// 角色职业分类
export const characterRoles = ['所有角色', '战士', '法师', '刺客', '坦克', '射手', '辅助'];

// 视频数据
export const videos = [
  { id: 1, title: '三连击教学', game: 'lol', character: 'yasuo', type: 'attack', thumbnail: 'https://via.placeholder.com/320x180/333/FFF?text=三连击', duration: '05:32', views: 12340 },
  { id: 2, title: '连招演示', game: 'albion', character: 'sword', type: 'attack', thumbnail: 'https://via.placeholder.com/320x180/333/FFF?text=连招', duration: '03:45', views: 8520 },
  { id: 3, title: '走位技巧', game: 'lol', character: 'ahri', type: 'walk', thumbnail: 'https://via.placeholder.com/320x180/333/FFF?text=走位', duration: '04:20', views: 15600 },
  { id: 4, title: '团战思路', game: 'albion', character: 'tank', type: 'team', thumbnail: 'https://via.placeholder.com/320x180/333/FFF?text=团战', duration: '08:15', views: 9200 },
  { id: 5, title: '刷野路线', game: 'lol', character: 'zed', type: 'jungle', thumbnail: 'https://via.placeholder.com/320x180/333/FFF?text=刷野', duration: '06:10', views: 11000 },
  { id: 6, title: '对线细节', game: 'albion', character: 'mage', type: 'lane', thumbnail: 'https://via.placeholder.com/320x180/333/FFF?text=对线', duration: '07:30', views: 7800 },
  { id: 7, title: '技能衔接', game: 'lol', character: 'yasuo', type: 'skill', thumbnail: 'https://via.placeholder.com/320x180/333/FFF?text=技能', duration: '04:50', views: 13500 },
  { id: 8, title: '装备选择', game: 'albion', character: 'assassin', type: 'build', thumbnail: 'https://via.placeholder.com/320x180/333/FFF?text=装备', duration: '05:40', views: 6700 },
  { id: 9, title: '意识培养', game: 'lol', character: 'ahri', type: 'awareness', thumbnail: 'https://via.placeholder.com/320x180/333/FFF?text=意识', duration: '09:20', views: 10200 },
  { id: 10, title: '极限反杀', game: 'albion', character: 'sword', type: 'highlight', thumbnail: 'https://via.placeholder.com/320x180/333/FFF?text=反杀', duration: '03:15', views: 18900 },
  { id: 11, title: '操作集锦', game: 'lol', character: 'zed', type: 'highlight', thumbnail: 'https://via.placeholder.com/320x180/333/FFF?text=集锦', duration: '05:00', views: 14300 },
  { id: 12, title: '新手入门', game: 'albion', character: 'tank', type: 'guide', thumbnail: 'https://via.placeholder.com/320x180/333/FFF?text=新手', duration: '10:30', views: 22000 },
  { id: 13, title: '高级技巧', game: 'lol', character: 'yasuo', type: 'advanced', thumbnail: 'https://via.placeholder.com/320x180/333/FFF?text=高级', duration: '07:45', views: 9800 },
  { id: 14, title: '阵容搭配', game: 'albion', character: 'mage', type: 'team', thumbnail: 'https://via.placeholder.com/320x180/333/FFF?text=阵容', duration: '06:50', views: 8100 },
  { id: 15, title: '地图资源', game: 'lol', character: 'ahri', type: 'map', thumbnail: 'https://via.placeholder.com/320x180/333/FFF?text=地图', duration: '08:00', views: 7500 },
  { id: 16, title: 'gank 时机', game: 'lol', character: 'zed', type: 'gank', thumbnail: 'https://via.placeholder.com/320x180/333/FFF?text=Gank', duration: '05:25', views: 11500 },
  { id: 17, title: '防守反击', game: 'albion', character: 'tank', type: 'defense', thumbnail: 'https://via.placeholder.com/320x180/333/FFF?text=防守', duration: '06:30', views: 6900 },
  { id: 18, title: '输出手法', game: 'albion', character: 'assassin', type: 'attack', thumbnail: 'https://via.placeholder.com/320x180/333/FFF?text=输出', duration: '04:40', views: 10800 },
];

// 轮播图数据
export const banners = [
  { id: 1, title: '本周推荐：亚索进阶教学', image: 'https://via.placeholder.com/640x360/DC3545/FFFFFF?text=本周推荐' },
  { id: 2, title: '新版本更新公告', image: 'https://via.placeholder.com/640x360/007bff/FFFFFF?text=更新公告' },
  { id: 3, title: '玩家投稿征集', image: 'https://via.placeholder.com/640x360/28a745/FFFFFF?text=投稿征集' },
];

// 动作分类
export const actionTypes = [
  '攻击 - 正', '攻击 - 侧', '攻击 - 背',
  '走位 - 正', '走位 - 侧', '走位 - 背',
  '技能 -Q', '技能 -W', '技能 -E', '技能 -R',
  '回城', '嘲讽', '舞蹈', '其他'
];
