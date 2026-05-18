import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { normalizeUser, toDisplayText } from '../lib/text'
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
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('')
  const [resendingCode, setResendingCode] = useState(false)
  const navigate = useNavigate()

  async function handleRegister(e) {
    e.preventDefault()
    if (password !== confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    if (!privacyAccepted) {
      setPrivacyOpen(true)
      setMessage({ type: 'error', text: 'Please read and accept the Data Privacy Act notice before creating an account.' })
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/auth/register', { fullName, phone, email, password, municipality })
      if (res.data?.requiresEmailVerification) {
        setPendingVerificationEmail(res.data.email || email)
        setVerificationCode('')
        setMessage({ type: 'success', text: 'Account created. Check your Gmail inbox and enter the verification code.' })
        return
      }

      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(normalizeUser(res.data.user)))
      setMessage({ type: 'success', text: 'Account created. Redirecting...' })
      window.dispatchEvent(new Event('user-updated'))
      navigate('/home', { replace: true })
    } catch (err) {
      const errorText =
        err?.response?.data?.error ||
        (err?.code === 'ERR_NETWORK' ? `Cannot reach backend server on ${api.defaults.baseURL}` : 'Registration failed')
      setMessage({ type: 'error', text: toDisplayText(errorText, 'Registration failed') })
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault()

    if (!pendingVerificationEmail || !verificationCode.trim()) {
      setMessage({ type: 'error', text: 'Enter the verification code sent to your Gmail.' })
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/auth/verify-signup-code', {
        email: pendingVerificationEmail,
        code: verificationCode.trim(),
      })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(normalizeUser(res.data.user)))
      setMessage({ type: 'success', text: 'Email verified. Redirecting...' })
      window.dispatchEvent(new Event('user-updated'))
      navigate('/home', { replace: true })
    } catch (err) {
      const errorText =
        err?.response?.data?.error ||
        (err?.code === 'ERR_NETWORK' ? `Cannot reach backend server on ${api.defaults.baseURL}` : 'Verification failed')
      setMessage({ type: 'error', text: toDisplayText(errorText, 'Verification failed') })
    } finally {
      setLoading(false)
    }
  }

  async function handleResendCode() {
    if (!pendingVerificationEmail) return

    setResendingCode(true)
    try {
      await api.post('/auth/resend-signup-code', { email: pendingVerificationEmail })
      setMessage({ type: 'success', text: 'A new verification code was sent to your Gmail inbox.' })
    } catch (err) {
      const errorText =
        err?.response?.data?.error ||
        (err?.code === 'ERR_NETWORK' ? `Cannot reach backend server on ${api.defaults.baseURL}` : 'Failed to resend code')
      setMessage({ type: 'error', text: toDisplayText(errorText, 'Failed to resend code') })
    } finally {
      setResendingCode(false)
    }
  }

  return (
    <div
      className="min-h-[calc(100vh-84px)] bg-[#f8f9fa] px-3 py-4 text-[#212529]"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-2xl rounded-tr-none border border-[#d7e0da] bg-white p-4 shadow-[0_12px_28px_rgba(0,68,27,0.12)] sm:p-5">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl rounded-br-none border border-[#d7e0da] bg-[#f8f9fa] shadow-[0_8px_18px_rgba(0,68,27,0.1)]">
              <img src="/logo.png" alt="DENR logo" className="h-[70px] w-[70px] object-contain" />
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#1a5e20]">Citizen Registration</p>
            <h1 className="mt-1 text-2xl font-black leading-tight text-[#00441b] sm:text-3xl">Create Account</h1>
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

          {pendingVerificationEmail ? (
            <form onSubmit={handleVerifyCode} className="mt-5 space-y-4">
              <div className="rounded-2xl rounded-tr-none border border-[#d7e0da] bg-[#f8f9fa] p-4">
                <p className="text-sm font-black text-[#00441b]">Verify Gmail</p>
                <p className="mt-1 text-sm leading-6 text-[#495057]">
                  Enter the code sent to <span className="break-all font-bold text-[#212529]">{pendingVerificationEmail}</span>.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#212529]">Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  className={`${inputClass} text-center text-xl font-black tracking-[0.18em] sm:text-2xl sm:tracking-[0.35em]`}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-[#003915] bg-[linear-gradient(180deg,#1a5e20_0%,#00441b_100%)] px-4 text-sm font-black text-white shadow-[0_4px_0_#003915,0_10px_22px_rgba(0,68,27,0.2)] transition active:translate-y-[2px] active:shadow-[0_2px_0_#003915,0_6px_14px_rgba(0,68,27,0.18)] disabled:cursor-not-allowed disabled:opacity-60 sm:gap-3 sm:px-5 sm:text-base"
              >
                <UserIcon />
                {loading ? 'Verifying...' : 'Verify and Continue'}
              </button>

              <button
                type="button"
                disabled={resendingCode}
                onClick={handleResendCode}
                className="min-h-12 w-full rounded-full border border-[#cfd8d3] bg-white px-5 text-sm font-black text-[#1a5e20] shadow-[0_3px_0_#cfd8d3] transition active:translate-y-[2px] active:shadow-[0_1px_0_#cfd8d3] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resendingCode ? 'Sending...' : 'Resend Code'}
              </button>
            </form>
          ) : (
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

            <div className="rounded-2xl rounded-tr-none border border-[#d7e0da] bg-[#f8f9fa] p-4">
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#495057]">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={() => {
                    if (privacyAccepted) {
                      setPrivacyAccepted(false)
                    } else {
                      setPrivacyOpen(true)
                    }
                  }}
                  className="mt-1 h-5 w-5 shrink-0 rounded border-[#cfd8d3] accent-[#00441b]"
                />
                <span>
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      setPrivacyOpen(true)
                    }}
                    className="font-black text-[#1a5e20] underline decoration-[#4c9a2a]/45 underline-offset-4"
                  >
                    Data Privacy Act notice
                  </button>
                  .
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-[#003915] bg-[linear-gradient(180deg,#1a5e20_0%,#00441b_100%)] px-4 text-sm font-black text-white shadow-[0_4px_0_#003915,0_10px_22px_rgba(0,68,27,0.2)] transition active:translate-y-[2px] active:shadow-[0_2px_0_#003915,0_6px_14px_rgba(0,68,27,0.18)] disabled:cursor-not-allowed disabled:opacity-60 sm:gap-3 sm:px-5 sm:text-base"
            >
              <UserIcon />
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          )}

          <p className="mt-5 text-center text-sm leading-6 text-[#495057]">
            Already registered?{' '}
            <Link to="/login" className="font-black text-[#1a5e20] underline decoration-[#4c9a2a]/45 underline-offset-4">
              Log in here
            </Link>
          </p>
        </div>
      </div>

      {privacyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#001d12]/70 px-3 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl rounded-tr-none border border-[#d7e0da] bg-white shadow-2xl">
            <div className="border-b border-[#d7e0da] bg-[#f8f9fa] px-5 py-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1a5e20]">Privacy Notice</p>
              <h2 className="mt-1 text-2xl font-black text-[#00441b]">Data Privacy Act of 2012</h2>
            </div>

            <div className="max-h-[58vh] space-y-4 overflow-y-auto px-5 py-4 text-sm leading-6 text-[#495057]">
              <p>
                In compliance with Republic Act No. 10173, also known as the Data Privacy Act of 2012, EcoWatch collects and processes your personal information only for environmental report submission, verification, monitoring, and official DENR-related case management.
              </p>
              <p>
                The information you provide may include your name, phone number, email address, municipality, report details, location data, and uploaded evidence. These details help authorized personnel validate reports, contact you when needed, prevent misuse, and maintain accurate reporting records.
              </p>
              <p>
                Your personal information will be handled with reasonable security measures and will only be accessed by authorized users for legitimate system and public service purposes. Report information may be used for monitoring, analytics, and administrative action while protecting personal details where appropriate.
              </p>
              <p>
                By creating an account, you confirm that the information you provide is true and that you consent to the collection, use, storage, and processing of your personal data for the purposes stated in this notice.
              </p>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#d7e0da] bg-white px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPrivacyOpen(false)}
                className="min-h-12 rounded-full border border-[#cfd8d3] bg-white px-5 text-sm font-black text-[#1a5e20] shadow-[0_3px_0_#cfd8d3] transition active:translate-y-[2px] active:shadow-[0_1px_0_#cfd8d3]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrivacyAccepted(true)
                  setPrivacyOpen(false)
                  setMessage(null)
                }}
                className="min-h-12 rounded-full border border-[#003915] bg-[#00441b] px-5 text-sm font-black text-white shadow-[0_3px_0_#003915] transition active:translate-y-[2px] active:shadow-[0_1px_0_#003915]"
              >
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
