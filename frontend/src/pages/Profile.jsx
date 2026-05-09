import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'

const MUNICIPALITIES = [
  'Olongapo',
  'Subic',
  'San Marcelino',
  'San Antonio',
  'San Narciso',
  'San Felipe',
  'Cabangan',
]

const fieldClass =
  'min-h-12 w-full rounded-xl rounded-tr-none border border-[#cfd8d3] bg-white px-4 py-3 text-base text-[#212529] shadow-[inset_0_2px_6px_rgba(0,68,27,0.08)] outline-none transition placeholder:text-[#6c757d] focus:border-[#1a5e20] focus:ring-3 focus:ring-[#4c9a2a]/20'

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

function ProfileIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  )
}

function SectionHeader({ label, title }) {
  return (
    <div className="border-b border-[#d7e0da] px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1a5e20]">{label}</p>
      <h2 className="mt-1 text-lg font-black text-[#00441b]">{title}</h2>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-[#212529]">{label}</label>
      {children}
    </div>
  )
}

function ReturnToDashboardButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#003915] bg-[#00441b] px-5 text-sm font-black text-white shadow-[0_3px_0_#003915] transition active:translate-y-[2px] active:shadow-[0_1px_0_#003915] sm:w-auto"
    >
      Return to Dashboard
    </button>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const user = readUser()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [email, setEmail] = useState(user?.email || '')
  const [municipality, setMunicipality] = useState(user?.municipality || '')
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const response = await api.patch('/auth/me', { name, phone, email, municipality })
      localStorage.setItem('user', JSON.stringify(response.data.user))
      localStorage.setItem('token', response.data.token)
      window.dispatchEvent(new Event('user-updated'))
      setMessage({ type: 'success', text: 'Profile updated successfully.' })
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Failed to update profile.' })
    } finally {
      setSaving(false)
    }
  }

  if (!localStorage.getItem('token')) {
    return (
      <div className="min-h-[calc(100vh-88px)] bg-[#fcfdfc] px-3 py-4">
        <div className="mx-auto w-full max-w-md space-y-3">
          <ReturnToDashboardButton onClick={() => navigate('/home')} />
          <div className="rounded-2xl rounded-tr-none border border-[#d7e0da] bg-white p-5 text-center shadow-[0_12px_28px_rgba(0,68,27,0.12)]">
            <h1 className="text-2xl font-black text-[#00441b]">Profile</h1>
            <p className="mt-2 text-sm text-[#495057]">Please sign in to view your account profile.</p>
            <Link
              to="/login"
              className="mt-5 inline-flex min-h-12 items-center rounded-full border border-[#003915] bg-[#00441b] px-6 text-sm font-black text-white shadow-[0_3px_0_#003915] transition active:translate-y-[2px] active:shadow-[0_1px_0_#003915]"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-[calc(100vh-88px)] overflow-x-hidden bg-[#fcfdfc] px-3 py-4 pb-24 text-[#212529]"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <ReturnToDashboardButton onClick={() => navigate('/home')} />

        <section className="rounded-2xl rounded-tr-none border border-[#d7e0da] bg-white p-5 shadow-[0_12px_28px_rgba(0,68,27,0.1)]">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl rounded-br-none bg-[#00441b] text-white shadow-[0_6px_14px_rgba(0,68,27,0.22)]">
              <ProfileIcon />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1a5e20]">Citizen Account</p>
              <h1 className="mt-1 break-words text-3xl font-black leading-tight text-[#00441b]">Update Profile</h1>
              <p className="mt-2 text-sm leading-6 text-[#495057]">Update the contact details used for environmental reports.</p>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl rounded-tl-none border border-[#d7e0da] bg-white shadow-[0_10px_24px_rgba(0,68,27,0.08)]">
          {message && (
            <div
              className={`mx-4 mt-4 rounded-xl rounded-tr-none border px-4 py-3 text-sm font-semibold ${
                message.type === 'success'
                  ? 'border-[#b9d7b3] bg-[#eef6ea] text-[#1a5e20]'
                  : 'border-[#e0b4aa] bg-[#fff3f0] text-[#8a2f20]'
              }`}
            >
              {message.text}
            </div>
          )}

          <section className="border-b border-[#d7e0da]">
            <SectionHeader label="Personal Information" title="Citizen Details" />
            <div className="grid gap-3 p-4">
              <Field label="Full Name">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  className={fieldClass}
                />
              </Field>

              <Field label="Email Address">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className={fieldClass}
                />
              </Field>

              <Field label="Contact Number">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  autoComplete="tel"
                  className={fieldClass}
                />
              </Field>

              <Field label="Address">
                <select value={municipality} onChange={(event) => setMunicipality(event.target.value)} className={fieldClass}>
                  <option value="">Select a municipality</option>
                  {MUNICIPALITIES.map((mun) => (
                    <option key={mun} value={mun}>
                      {mun}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section className="border-b border-[#d7e0da]">
            <SectionHeader label="Account Security" title="Security Status" />
            <div className="grid gap-3 p-4">
              <div className="rounded-xl rounded-tr-none border border-[#d7e0da] bg-[#f8f9fa] p-4">
                <p className="text-sm font-bold text-[#212529]">Login credential</p>
                <p className="mt-1 text-sm leading-6 text-[#495057]">
                  Your email or phone number is used for account access. Keep both contact fields current.
                </p>
              </div>
              <div className="rounded-xl rounded-tl-none border border-[#d7e0da] bg-[#eef6ea] p-4">
                <p className="text-sm font-bold text-[#1a5e20]">Session token refresh</p>
                <p className="mt-1 text-sm leading-6 text-[#495057]">
                  Saving this form refreshes your session with the latest profile details.
                </p>
              </div>
            </div>
          </section>

          <div className="grid gap-3 p-4">
            <p className="rounded-xl rounded-tr-none border border-[#d7e0da] bg-[#f8f9fa] px-4 py-3 text-sm font-semibold leading-6 text-[#495057]">
              Review all fields before saving.
            </p>
            <Link
              to="/home"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#cfd8d3] bg-white px-5 text-sm font-black text-[#1a5e20] shadow-[0_3px_0_#cfd8d3] transition active:translate-y-[2px] active:shadow-[0_1px_0_#cfd8d3] sm:w-auto sm:justify-self-start"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#003915] bg-[#00441b] px-5 text-sm font-black text-white shadow-[0_3px_0_#003915] transition active:translate-y-[2px] active:shadow-[0_1px_0_#003915] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:justify-self-end"
            >
              {saving ? 'Saving...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
