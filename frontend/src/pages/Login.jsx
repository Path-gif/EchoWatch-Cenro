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

function BackIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('')
  const [resendingEmail, setResendingEmail] = useState(false)
  const navigate = useNavigate()

  function finishCitizenLogin(data) {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(normalizeUser(data.user)))
    setMessage({ type: 'success', text: 'Citizen signed in successfully.' })
    window.dispatchEvent(new Event('user-updated'))
    navigate('/home', { replace: true })
  }

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

      if (res.data?.role === 'admin') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.setItem('admin_token', res.data.token)
        localStorage.setItem('admin_user', JSON.stringify(res.data.admin))
        setMessage({ type: 'success', text: 'Admin signed in successfully.' })
        navigate('/admin/dashboard', { replace: true })
        return
      }

      finishCitizenLogin(res.data)
    } catch (err) {
      if (err?.response?.data?.error === 'email_not_confirmed') {
        setPendingVerificationEmail(submittedEmail)
        setMessage({ type: 'error', text: 'Confirm your Gmail using the email link before signing in.' })
        return
      }

      const errorText =
        err?.response?.data?.error ||
        (err?.code === 'ERR_NETWORK' ? `Cannot reach backend server on ${api.defaults.baseURL}` : 'Login failed')
      setMessage({ type: 'error', text: toDisplayText(errorText, 'Login failed') })
    } finally {
      setLoading(false)
    }
  }

  async function handleResendEmail() {
    if (!pendingVerificationEmail) return

    setResendingEmail(true)
    try {
      await api.post('/auth/resend-signup-code', { email: pendingVerificationEmail })
      setMessage({ type: 'success', text: 'A new confirmation email was sent to your Gmail inbox.' })
    } catch (err) {
      const errorText =
        err?.response?.data?.error ||
        (err?.code === 'ERR_NETWORK' ? `Cannot reach backend server on ${api.defaults.baseURL}` : 'Failed to resend confirmation email')
      setMessage({ type: 'error', text: toDisplayText(errorText, 'Failed to resend confirmation email') })
    } finally {
      setResendingEmail(false)
    }
  }

  return (
    <div
      className="flex min-h-[calc(100vh-128px)] items-center justify-center overflow-x-hidden bg-[#fcfdfc] px-3 py-4 text-[#212529]"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div className="w-full max-w-md">
        <div className="relative w-full rounded-2xl rounded-tr-none border border-[#d7e0da] bg-white p-4 shadow-[0_12px_28px_rgba(0,68,27,0.12)] sm:p-5">
          <Link
            to="/"
            aria-label="Back to landing page"
            className="absolute left-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#cfd8d3] bg-white text-[#00441b] shadow-[0_2px_0_#d7e0da] transition hover:bg-[#eef6ea] active:translate-y-[1px] active:shadow-[0_1px_0_#d7e0da]"
          >
            <BackIcon />
          </Link>
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl rounded-br-none border border-[#d7e0da] bg-[#f8f9fa] shadow-[0_8px_18px_rgba(0,68,27,0.1)]">
              <img src="/logo.png" alt="DENR logo" className="h-[70px] w-[70px] object-contain" />
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#1a5e20]">EcoWatch Access</p>
            <h1 className="mt-1 text-2xl font-black leading-tight text-[#00441b] sm:text-3xl">Sign In</h1>
            <p className="mt-2 text-sm leading-6 text-[#495057]">Use your account credentials. The system will open the correct dashboard automatically.</p>
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

          {pendingVerificationEmail ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl rounded-tr-none border border-[#d7e0da] bg-[#f8f9fa] p-4">
                <p className="text-sm font-black text-[#00441b]">Verify Gmail</p>
                <p className="mt-1 text-sm leading-6 text-[#495057]">
                  Open the confirmation email sent to <span className="break-all font-bold text-[#212529]">{pendingVerificationEmail}</span>, then click the link inside it.
                </p>
                <p className="mt-3 text-sm leading-6 text-[#495057]">
                  After your Gmail is confirmed, sign in again with your email and password.
                </p>
              </div>

              <button
                type="button"
                disabled={resendingEmail}
                onClick={handleResendEmail}
                className="min-h-12 w-full rounded-full border border-[#cfd8d3] bg-white px-5 text-sm font-black text-[#1a5e20] shadow-[0_3px_0_#cfd8d3] transition active:translate-y-[2px] active:shadow-[0_1px_0_#cfd8d3] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resendingEmail ? 'Sending...' : 'Resend Confirmation Email'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPendingVerificationEmail('')
                  setMessage(null)
                }}
                className="min-h-12 w-full rounded-full border border-[#003915] bg-[#00441b] px-5 text-sm font-black text-white shadow-[0_3px_0_#003915] transition active:translate-y-[2px] active:shadow-[0_1px_0_#003915]"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
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
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-[#003915] bg-[linear-gradient(180deg,#1a5e20_0%,#00441b_100%)] px-4 text-sm font-black text-white shadow-[0_4px_0_#003915,0_10px_22px_rgba(0,68,27,0.2)] transition active:translate-y-[2px] active:shadow-[0_2px_0_#003915,0_6px_14px_rgba(0,68,27,0.18)] disabled:cursor-not-allowed disabled:opacity-60 sm:gap-3 sm:px-5 sm:text-base"
            >
              <LoginIcon />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          )}

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
