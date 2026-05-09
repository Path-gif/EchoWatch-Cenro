import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000')

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
