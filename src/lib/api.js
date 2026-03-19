import axios from 'axios';

// 创建 axios 实例（前台 API）
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  // ⭐ 禁用缓存，确保每次请求都获取最新数据
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
});

// ⭐ 添加请求拦截器，在 URL 后添加时间戳防止缓存
api.interceptors.request.use(config => {
  // GET 请求添加时间戳防止缓存
  if (config.method === 'get') {
    config.params = {
      ...config.params,
      _t: Date.now(), // 时间戳防止缓存
    };
  }
  return config;
});

// 角色 API
export const charactersAPI = {
  // 获取角色列表
  getByGame: (gameId, params = {}) => {
    return api.get('/characters', {
      params: { gameId, ...params },
    });
  },

  // 获取角色详情（带动作）
  getById: (id) => {
    return api.get(`/characters/${id}`);
  },

  // 获取角色的动作列表
  getActions: (id) => {
    return api.get(`/characters/${id}/actions`);
  },
};

// 动作 API
export const actionsAPI = {
  // 获取所有动作
  getAll: () => {
    return api.get('/actions');
  },
};

// 角色分类 API
export const characterRolesAPI = {
  // 获取角色分类列表
  getAll: (gameId) => {
    return api.get('/character-roles', {
      params: { gameId },
    });
  },
};

// 游戏 API
export const gamesAPI = {
  // 获取游戏列表
  getAll: () => {
    return api.get('/games');
  },
};

// 视频 API
export const videosAPI = {
  // 搜索视频
  search: (query) => {
    return api.get('/videos/search', {
      params: { q: query },
    });
  },

  // 获取视频列表
  getAll: (params) => {
    return api.get('/videos', { params });
  },
};

// 网站设置 API
export const siteSettingsAPI = {
  // 获取所有设置
  getAll: () => {
    return api.get('/settings');
  },

  // 获取单个设置
  getOne: (key) => {
    return api.get(`/settings/${key}`);
  },
};
