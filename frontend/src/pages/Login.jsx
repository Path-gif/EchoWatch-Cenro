import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { normalizeUser, toDisplayText } from '../lib/text'
import PasswordField from '../components/PasswordField'

const inputClass =
  'min-h-12 w-full rounded-xl rounded-tr-none border border-[#cfd8d3] bg-white px-4 py-3 text-[#212529] shadow-[inset_0_2px_6px_rgba(0,68,27,0.08)] outline-none transition placeholder:text-[#6c757d] focus:border-[#1a5e20] focus:ring-3 focus:ring-[#4c9a2a]/20'

function LoginIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M14 4h5v16h-5" />
    </svg>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const submittedEmail = String(formData.get('email') || email).trim()
    const submittedPassword = String(formData.get('password') || password)

    setEmail(submittedEmail)
    setPassword(submittedPassword)

    if (!submittedEmail || !submittedPassword) {
      setMessage({ type: 'error', text: 'Please enter your email or phone and password.' })
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const res = await api.post('/auth/login', { email: submittedEmail, password: submittedPassword })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(normalizeUser(res.data.user)))
      setMessage({ type: 'success', text: 'Signed in successfully.' })
      window.dispatchEvent(new Event('user-updated'))
      if (res.status === 200) {
        navigate('/home', { replace: true })
      }
    } catch (err) {
      const errorText =
        err?.response?.data?.error ||
        (err?.code === 'ERR_NETWORK' ? `Cannot reach backend server on ${api.defaults.baseURL}` : 'Login failed')
      setMessage({ type: 'error', text: toDisplayText(errorText, 'Login failed') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-[calc(100vh-128px)] items-center justify-center overflow-x-hidden bg-[#fcfdfc] px-3 py-4 text-[#212529]"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div className="w-full max-w-md">
        <div className="w-full rounded-2xl rounded-tr-none border border-[#d7e0da] bg-white p-5 shadow-[0_12px_28px_rgba(0,68,27,0.12)]">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl rounded-br-none border border-[#d7e0da] bg-[#f8f9fa] shadow-[0_8px_18px_rgba(0,68,27,0.1)]">
              <img src="/logo.png" alt="DENR logo" className="h-[70px] w-[70px] object-contain" />
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#1a5e20]">Citizen Access</p>
            <h1 className="mt-1 text-3xl font-black leading-tight text-[#00441b]">Citizen Login</h1>
            <p className="mt-2 text-sm leading-6 text-[#495057]">Sign in with your registered email or phone number to access environmental reports.</p>
          </div>

          {message && (
            <div
              className={`mt-5 rounded-[22px] rounded-tr-[10px] border px-4 py-3 text-sm font-semibold ${
                message.type === 'success'
                  ? 'border-[#b9d7b3] bg-[#eef6ea] text-[#1a5e20]'
                  : 'border-[#e0b4aa] bg-[#fff3f0] text-[#8a2f20]'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#212529]">Email or Phone</label>
              <input
                type="text"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="JuanDelaCruz@gmail.com"
                autoComplete="username"
                className={inputClass}
              />
            </div>

            <PasswordField
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              name="password"
              autoComplete="current-password"
            />

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full border border-[#003915] bg-[linear-gradient(180deg,#1a5e20_0%,#00441b_100%)] px-5 text-base font-black text-white shadow-[0_4px_0_#003915,0_10px_22px_rgba(0,68,27,0.2)] transition active:translate-y-[2px] active:shadow-[0_2px_0_#003915,0_6px_14px_rgba(0,68,27,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LoginIcon />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm leading-6 text-[#495057]">
            No account yet?{' '}
            <Link to="/register" className="font-black text-[#1a5e20] underline decoration-[#4c9a2a]/45 underline-offset-4">
              Create one here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
