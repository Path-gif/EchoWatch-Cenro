import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import PasswordField from '../components/PasswordField'

const inputClass =
  'min-h-12 w-full rounded-xl rounded-tr-none border border-[#cfd8d3] bg-white px-4 py-3 text-[#212529] shadow-[inset_0_2px_6px_rgba(0,68,27,0.08)] outline-none transition placeholder:text-[#6c757d] focus:border-[#1a5e20] focus:ring-3 focus:ring-[#4c9a2a]/20'

const municipalities = ['Olongapo', 'Subic', 'San Marcelino', 'San Antonio', 'San Narciso', 'San Felipe', 'Cabangan']

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  )
}

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [municipality, setMunicipality] = useState('Olongapo')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleRegister(e) {
    e.preventDefault()
    if (password !== confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/auth/register', { fullName, phone, email, password, municipality })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      setMessage({ type: 'success', text: 'Account created. Redirecting...' })
      window.dispatchEvent(new Event('user-updated'))
      navigate('/home', { replace: true })
    } catch (err) {
      const errorText =
        err?.response?.data?.error ||
        (err?.code === 'ERR_NETWORK' ? `Cannot reach backend server on ${api.defaults.baseURL}` : 'Registration failed')
      setMessage({ type: 'error', text: errorText })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-[calc(100vh-84px)] bg-[#f8f9fa] px-3 py-4 text-[#212529]"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl rounded-tr-none border border-[#d7e0da] bg-white p-5 shadow-[0_12px_28px_rgba(0,68,27,0.12)]">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl rounded-br-none border border-[#d7e0da] bg-[#f8f9fa] shadow-[0_8px_18px_rgba(0,68,27,0.1)]">
              <img src="/logo.png" alt="DENR logo" className="h-[70px] w-[70px] object-contain" />
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#1a5e20]">Citizen Registration</p>
            <h1 className="mt-1 text-3xl font-black leading-tight text-[#00441b]">Create Account</h1>
            <p className="mt-2 text-sm leading-6 text-[#495057]">Register once to submit and track environmental reports.</p>
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

          <form onSubmit={handleRegister} className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#212529]">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Dela Cruz"
                autoComplete="name"
                className={inputClass}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-[#212529]">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09123456789"
                  autoComplete="tel"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-[#212529]">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="JuanDelaCruz@gmail.com"
                  autoComplete="email"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#212529]">Municipality</label>
              <select
                required
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                className={inputClass}
              >
                {municipalities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <PasswordField
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              name="password"
              autoComplete="new-password"
            />

            <PasswordField
              label="Confirm Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm your password"
              name="confirmPassword"
              autoComplete="new-password"
            />

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full border border-[#003915] bg-[linear-gradient(180deg,#1a5e20_0%,#00441b_100%)] px-5 text-base font-black text-white shadow-[0_4px_0_#003915,0_10px_22px_rgba(0,68,27,0.2)] transition active:translate-y-[2px] active:shadow-[0_2px_0_#003915,0_6px_14px_rgba(0,68,27,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserIcon />
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm leading-6 text-[#495057]">
            Already registered?{' '}
            <Link to="/login" className="font-black text-[#1a5e20] underline decoration-[#4c9a2a]/45 underline-offset-4">
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
