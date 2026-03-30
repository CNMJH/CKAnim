import api from './api'

export const authAPI = {
  login: (username, password) =>
    api.post('/admin/login', { username, password }),

  getMe: () => api.get('/admin/me'),

  updatePassword: (currentPassword, newPassword) =>
    api.put('/admin/password', { currentPassword, newPassword }),
}

export const gamesAPI = {
  getAll: () => api.get('/admin/games'),
  getOne: (id) => api.get(`/admin/games/${id}`),
  getById: (id) => api.get(`/admin/games/${id}`),
  create: (data) => api.post('/admin/games', data),
  update: (id, data) => api.put(`/admin/games/${id}`, data),
  delete: (id) => api.delete(`/admin/games/${id}`),
  getIconToken: (filename, gameId) => api.post('/admin/games/icon-token', { filename, gameId }),
  deleteIcon: (key) => api.delete(`/admin/games/icon?key=${encodeURIComponent(key)}`),
}

export const categoriesAPI = {
  getByGame: (gameId) => api.get(`/admin/games/${gameId}/categories`),
  create: (data) => api.post('/admin/categories', data),
  update: (id, data) => api.put(`/admin/categories/${id}`, data),
  delete: (id) => api.delete(`/admin/categories/${id}`),
  reorder: (categoryId, newOrder) =>
    api.put('/admin/categories/reorder', { categoryId, newOrder }),
  getIconToken: (filename, categoryId) => api.post('/admin/categories/icon-token', { filename, categoryId }),
}

export const videosAPI = {
  getAll: (params) => api.get('/admin/videos', { params }),
  getOne: (id) => api.get(`/admin/videos/${id}`),
  getUploadToken: (filename, gameId, categoryIds = [], actionId) =>
    api.post('/admin/videos/upload-token', { filename, gameId, categoryIds, actionId }),
  getCoverUploadToken: (coverKey) =>
    api.post('/admin/videos/cover-upload-token', { coverKey }),
  create: (data) => api.post('/admin/videos', data),
  update: (id, data) => api.put(`/admin/videos/${id}`, data),
  delete: (id) => api.delete(`/admin/videos/${id}`),
  replace: (id, data) => api.post(`/admin/videos/${id}/replace`, data),
}

export const tagsAPI = {
  getAll: () => api.get('/admin/tags'),
  create: (data) => api.post('/admin/tags', data),
  update: (id, data) => api.put(`/admin/tags/${id}`, data),
  delete: (id) => api.delete(`/admin/tags/${id}`),
}

export const charactersAPI = {
  getAll: () => api.get('/admin/characters'),
  getByGame: (gameId) => api.get(`/admin/characters?gameId=${gameId}`),
  getById: (id) => api.get(`/admin/characters/${id}`),
  create: (data) => api.post('/admin/characters', data),
  update: (id, data) => api.put(`/admin/characters/${id}`, data),
  delete: (id) => api.delete(`/admin/characters/${id}`),
  getAvatarToken: (filename, characterId) => api.post('/admin/characters/avatar-token', { filename, characterId }),
}

export const actionsAPI = {
  getAll: (params) => api.get('/admin/actions', { params }),
  getById: (id) => api.get(`/admin/actions/${id}`),
  create: (data) => api.post('/admin/actions', data),
  update: (id, data) => api.put(`/admin/actions/${id}`, data),
  delete: (id) => api.delete(`/admin/actions/${id}`),
}

export const settingsAPI = {
  getAll: () => api.get('/settings'),
  getOne: (key) => api.get(`/settings/${key}`),
  update: (key, data) => api.put(`/settings/${key}`, data),
  batchUpdate: (settings) => api.post('/settings/batch', { settings }),
  init: () => api.post('/settings/init'),
}

export const userLibraryAdminAPI = {
  getSettings: () => api.get('/user-library/admin/settings'),
  updateSetting: (key, data) => api.put(`/user-library/admin/settings/${key}`, data),
  batchUpdateSettings: (settings) => api.post('/user-library/admin/settings/batch', { settings }),
}

export const userAdminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUserVip: (id, data) => api.put(`/admin/users/${id}/vip`, data),
  resetUserPassword: (id, data) => api.put(`/admin/users/${id}/reset-password`, data),
  updateUserRole: (id, data) => api.put(`/admin/users/${id}/role`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
}

export const lotteryAPI = {
  // 获取抽奖配置列表
  getConfigs: () => api.get('/lottery/configs'),

  // 获取单个配置
  getConfig: (id) => api.get(`/lottery/configs/${id}`),

  // 创建配置
  createConfig: (data) => api.post('/lottery/configs', data),

  // 更新配置
  updateConfig: (id, data) => api.put(`/lottery/configs/${id}`, data),

  // 删除配置
  deleteConfig: (id) => api.delete(`/lottery/configs/${id}`),

  // 获取奖品列表
  getPrizes: (configId) => api.get(`/lottery/configs/${configId}/prizes`),

  // 创建奖品
  createPrize: (configId, data) => api.post(`/lottery/configs/${configId}/prizes`, data),

  // 更新奖品
  updatePrize: (id, data) => api.put(`/lottery/prizes/${id}`, data),

  // 删除奖品
  deletePrize: (id) => api.delete(`/lottery/prizes/${id}`),

  // 获取抽奖记录
  getRecords: (params) => api.get('/lottery/records', { params }),

  // 参与抽奖
  draw: (configId) => api.post('/lottery/draw', { configId }),

  // 获取用户今日抽奖次数
  getUserTodayDraws: (configId) => api.get(`/lottery/user-draws/${configId}`),
}
