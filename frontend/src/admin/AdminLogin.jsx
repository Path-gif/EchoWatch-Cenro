import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { normalizeUser, toDisplayText } from '../lib/text'
import PasswordField from '../components/PasswordField'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const submittedUsername = String(formData.get('username') || username).trim()
    const submittedPassword = String(formData.get('password') || password)

    setUsername(submittedUsername)
    setPassword(submittedPassword)

    if (!submittedUsername || !submittedPassword) {
      setMessage({ type: 'error', text: 'Please enter your admin email and password.' })
      return
    }

    setLoading(true)

    try {
      const res = await api.post('/auth/login', { email: submittedUsername, password: submittedPassword })
      if (res.data?.role !== 'admin') {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user', JSON.stringify(normalizeUser(res.data.user)))
        setMessage({ type: 'success', text: 'Citizen signed in successfully. Redirecting...' })
        window.dispatchEvent(new Event('user-updated'))
        setTimeout(() => navigate('/home'), 700)
        return
      }
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.setItem('admin_token', res.data.token)
      localStorage.setItem('admin_user', JSON.stringify(res.data.admin))
      setMessage({ type: 'success', text: 'Admin access granted. Redirecting...' })
      setTimeout(() => navigate('/admin/dashboard'), 700)
    } catch (err) {
      const code = toDisplayText(err?.response?.data?.error)
      let text = 'Login failed'
      if (code === 'invalid_credentials') text = 'Incorrect email or password.'
      else if (code === 'account_inactive') text = 'Account inactive. Contact support.'
      else if (code === 'internal_error') text = 'Server error. Try again later.'
      else if (code) text = code
      setMessage({ type: 'error', text })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center overflow-x-hidden bg-[linear-gradient(180deg,#dbe8e2_0%,#f6f7f4_45%,#eef3f1_100%)] px-3 py-4">
      <div className="grid max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto rounded-2xl rounded-tr-none border border-[#cddbd4] bg-white shadow-[0_24px_70px_rgba(0,68,27,0.16)] lg:grid-cols-[1fr_0.9fr]">
        <section className="relative overflow-hidden bg-[linear-gradient(145deg,#00441b_0%,#0f5f46_58%,#4c9a2a_100%)] px-5 py-6 text-white sm:px-7 lg:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_30%),linear-gradient(to_bottom,transparent,rgba(7,29,22,0.18))]" />
          <div className="relative max-w-xl">
            <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#f1dd97]">
              DENR Administration
            </p>
            <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">Administrative Access Portal</h1>
            <p className="mt-3 text-sm leading-7 text-emerald-50/92 sm:text-base">
              Sign in to manage citizen reports, monitor operational activity, and configure the EcoWatch reporting platform.
            </p>

            <div className="mt-5 grid gap-3">
              {[
                ['Users', 'Access future staff and account management tools.'],
                ['Reports', 'Review field submissions and response workflows.'],
                ['Settings', 'Prepare operational controls and system configuration.'],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-[1.25rem] border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f1dd97]">{title}</p>
                  <p className="mt-2 text-sm text-emerald-50/90">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-6 sm:px-7 lg:px-8">
          <div className="mx-auto max-w-md">
            <div className="mb-5 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f3f6f3] ring-1 ring-[#d7ddd7]">
                <img src="/logo.png" alt="DENR logo" className="h-[74px] w-[74px] object-contain" />
              </div>
              <h2 className="mt-4 text-3xl font-black text-[#123629]">Admin Login</h2>
              <p className="mt-2 text-sm text-slate-600">Use your administrator credentials to access the dashboard.</p>
            </div>

            {message && (
              <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${message.type === 'success' ? 'border-green-300 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-700'}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">Admin Email</label>
                <input
                  type="text"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                placeholder="Admin@gmail.com"
                  autoComplete="username"
                  required
                  aria-label="Admin email"
                  className="min-h-12 w-full rounded-xl rounded-tr-none border border-[#cfd8d3] px-4 py-3 outline-none transition focus:border-[#00441b] focus:ring-2 focus:ring-[#4c9a2a]/30"
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
                className="min-h-14 w-full rounded-full border border-[#003915] bg-[#00441b] px-5 py-3 font-black text-white shadow-[0_4px_0_#003915,0_10px_22px_rgba(0,68,27,0.2)] transition active:translate-y-[2px] active:shadow-[0_2px_0_#003915,0_6px_14px_rgba(0,68,27,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Login'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-600">
              Citizen account? <Link to="/login" className="font-semibold text-[#0f5f46]">Go to Citizen Login</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
