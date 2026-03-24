/**
 * 前台用户认证工具
 */
const AUTH_KEY = 'ckanim_user_token';

/**
 * 检查用户是否已认证
 * @returns {boolean} 是否已认证
 */
export function isAuthenticated() {
  return !!localStorage.getItem(AUTH_KEY);
}

/**
 * 获取认证 token
 * @returns {string|null} token
 */
export function getToken() {
  return localStorage.getItem(AUTH_KEY);
}

/**
 * 保存认证 token
 * @param {string} token - JWT token
 */
export function setToken(token) {
  localStorage.setItem(AUTH_KEY, token);
}

/**
 * 清除认证 token
 */
export function clearToken() {
  localStorage.removeItem(AUTH_KEY);
}

export default {
  isAuthenticated,
  getToken,
  setToken,
  clearToken,
};
