import axios from 'axios';

// 创建 axios 实例（前台 API）
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
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
