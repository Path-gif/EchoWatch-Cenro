import axios from 'axios'

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()
const isLocalApiUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(configuredApiUrl || '')
const baseURL = import.meta.env.PROD
  ? (configuredApiUrl && !isLocalApiUrl ? configuredApiUrl : '/api')
  : (configuredApiUrl || 'http://localhost:3000')

const instance = axios.create({ baseURL })

instance.interceptors.request.use(cfg => {
  const adminToken = localStorage.getItem('admin_token')
  const userToken = localStorage.getItem('token')
  // prefer admin token for admin routes
  if (cfg.url && cfg.url.startsWith('/admin') && adminToken) {
    cfg.headers.Authorization = `Bearer ${adminToken}`
  } else if (userToken) {
    cfg.headers.Authorization = `Bearer ${userToken}`
  }
  return cfg
})

export default instance
