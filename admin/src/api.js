import axios from 'axios'

// 管理后台统一 API 客户端
// 后端已经固定在 3005 端口启动，这里与移动端保持一致
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3005',
  timeout: 60000, // Render free 冷启动可能超过 15 秒
})

// 请求拦截器：自动注入 Token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：处理未授权
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.status, error.message)
    if (error.response?.status === 401 || error.response?.status === 403) {
      alert('权限不足或登录已过期，请通过 App 重新进入')
      // window.location.href = 'http://localhost:3001/#/login'
    }
    return Promise.reject(error)
  }
)

export default api
