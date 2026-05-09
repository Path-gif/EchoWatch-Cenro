import React, { useState } from 'react'
import api from '../lib/api'
import { useNavigate, Link } from 'react-router-dom'

export default function Auth() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e) {
    e?.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { phone: username, password })
      const token = res.data.token
      localStorage.setItem('token', token)
      setMessage({ type: 'success', text: 'Signed in successfully!' })
      setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Login failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-12">
      {/* Icon */}
      <div className="h-20 w-20 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-4xl mb-6 shadow-lg">
        👤
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold text-gray-900 text-center">Citizen Login</h1>
      <p className="text-gray-600 mt-2 text-center">Sign in to submit environmental reports</p>

      {/* Message Display */}
      {message && (
        <div className={`mt-6 p-4 rounded-lg border-2 w-full max-w-md ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-300 text-green-700' 
            : 'bg-red-50 border-red-300 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md mt-8">
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Username <span className="text-red-500">*</span></label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-400 text-xl"></span>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full border-2 border-gray-200 rounded-2xl pl-12 pr-4 py-3 focus:border-blue-500 focus:outline-none transition text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-400 text-xl">🔐</span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full border-2 border-gray-200 rounded-2xl pl-12 pr-12 py-3 focus:border-blue-500 focus:outline-none transition text-gray-700 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-gray-400 text-xl hover:text-gray-600 transition"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-2xl transition shadow-md text-lg flex items-center justify-center gap-2"
          >
            {loading ? '⏳ Signing in...' : '→ Sign In'}
          </button>
        </form>

        {/* Sign Up Link */}
        <div className="text-center mt-6 text-gray-600">
          Don't have an account? <Link to="/auth/register" className="text-blue-600 hover:text-blue-700 font-semibold">Create one here</Link>
        </div>
      </div>

      {/* Back to Home */}
      <div className="mt-8">
        <Link to="/" className="text-gray-600 hover:text-gray-800 font-semibold text-center flex items-center gap-2">
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center text-white font-bold">D</div>
          <h1 className="mt-4 text-2xl font-semibold">DENR CENRO Citizen Portal</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to submit environmental reports</p>
        </div>

        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => { setMode('login'); setMessage(null) }}
            className={`flex-1 py-2 rounded-lg ${mode === 'login' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('register'); setMessage(null) }}
            className={`flex-1 py-2 rounded-lg ${mode === 'register' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Create Account
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+63 912 345 6789"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <div>
              <button type="submit" className="btn-primary">Sign In</button>
            </div>

            <div className="text-center">
              <button type="button" onClick={handleForgot} className="text-sm text-blue-600 hover:underline">Forgot password?</button>
            </div>

            <div className="text-center text-sm text-gray-600">
              Don’t have an account? <button type="button" onClick={() => setMode('register')} className="text-blue-600 hover:underline">Create one here.</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+63 912 345 6789"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <div>
              <button type="submit" className="btn-primary">Create Account</button>
            </div>

            <div className="text-center text-sm text-gray-600">
              Already have an account? <button type="button" onClick={() => setMode('login')} className="text-blue-600 hover:underline">Sign in</button>
            </div>
          </form>
        )}

        {message && <div className="mt-4 text-center text-sm text-red-600">{message}</div>}
      </div>
    </div>
  )
}
