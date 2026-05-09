import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import DescriptionSuggestions from '../components/DescriptionSuggestions'

const inputClass =
  'min-h-12 w-full rounded-xl rounded-tr-none border border-[#cfd8d3] bg-white px-4 py-3 text-[#212529] shadow-[inset_0_2px_6px_rgba(0,68,27,0.08)] outline-none transition placeholder:text-[#6c757d] focus:border-[#1a5e20] focus:ring-3 focus:ring-[#4c9a2a]/20'

const invalidInputClass =
  'border-[#d56b5f] bg-[#fff8f7] focus:border-[#b33a2e] focus:ring-[#d56b5f]/20'

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

function getTodayDateValue() {
  const now = new Date()
  const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10)
}

function Icon({ type }) {
  const paths = {
    location: (
      <>
        <path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    media: (
      <>
        <path d="M4 7h3l1.5-2h7L17 7h3v12H4V7Z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
    user: (
      <>
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </>
    ),
    hidden: (
      <>
        <path d="M3 11c2.4-3.6 5.4-5.4 9-5.4s6.6 1.8 9 5.4c-2.4 3.6-5.4 5.4-9 5.4S5.4 14.6 3 11Z" />
        <path d="M3 3l18 18" />
      </>
    ),
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[type]}
    </svg>
  )
}

function SectionShell({ icon, title, children }) {
  return (
    <section className="rounded-2xl rounded-tr-none border border-[#d7e0da] bg-white p-4 shadow-[0_8px_18px_rgba(0,68,27,0.08)]">
      <div className="mb-3 flex items-center gap-3">
        {icon ? (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl rounded-br-none bg-[#00441b] text-white">
            {icon}
          </span>
        ) : null}
        <h2 className="text-base font-black text-[#00441b]">{title}</h2>
      </div>
      {children}
    </section>
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

export default function SubmitReport() {
  const navigate = useNavigate()
  const [user, setUser] = useState(readUser())
  const [locationMode, setLocationMode] = useState('manual')
  const [formData, setFormData] = useState({
    violationType: 'Illegal Cutting (Section 77)',
    reportDate: getTodayDateValue(),
    description: '',
    latitude: null,
    longitude: null,
    manualLocation: '',
    anonymous: null,
  })
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mediaFiles, setMediaFiles] = useState([])
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const hasTitle = Boolean(formData.violationType)
  const hasDate = Boolean(formData.reportDate)
  const hasDescription = Boolean(formData.description.trim())
  const hasLocation = Boolean(formData.manualLocation.trim()) || (formData.latitude != null && formData.longitude != null)
  const hasIdentitySelection = formData.anonymous !== null
  const isFormValid = hasTitle && hasDate && hasDescription && hasLocation && hasIdentitySelection

  const fieldHasError = (valid) => submitAttempted && !valid

  useEffect(() => {
    setUser(readUser())
    if (!localStorage.getItem('token')) {
      setMessage({ type: 'error', text: 'Please sign in before submitting a report.' })
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitAttempted(true)

    if (!localStorage.getItem('token')) {
      navigate('/login', { replace: true })
      return
    }

    if (!isFormValid) {
      setMessage({ type: 'error', text: 'Complete all required fields before submitting the report.' })
      return
    }

    setLoading(true)

    try {
      const payload = new FormData()
      payload.append('violation_type', formData.violationType)
      payload.append('report_date', formData.reportDate)
      payload.append('description', formData.description.trim())
      if (formData.latitude != null) payload.append('latitude', String(formData.latitude))
      if (formData.longitude != null) payload.append('longitude', String(formData.longitude))
      payload.append('location_manual', formData.manualLocation.trim())
      payload.append('is_anonymous', formData.anonymous ? '1' : '0')
      mediaFiles.forEach((file) => payload.append('media', file))

      const response = await api.post('/reports', payload)

      setMessage({ type: 'success', text: `Report submitted. Reference: ${response.data.reference_number}` })
      setFormData({
        violationType: 'Illegal Cutting (Section 77)',
        reportDate: getTodayDateValue(),
        description: '',
        latitude: null,
        longitude: null,
        manualLocation: '',
        anonymous: null,
      })
      setSubmitAttempted(false)
      setMediaFiles([])
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Failed to submit report. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const captureLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationMode('gps')
        setFormData((current) => ({
          ...current,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          manualLocation: '',
        }))
        setMessage({ type: 'success', text: 'Location captured successfully.' })
      },
      (error) => {
        setMessage({ type: 'error', text: `Failed to capture location: ${error.message}` })
      }
    )
  }

  return (
    <div
      className="min-h-[calc(100vh-88px)] bg-[#f8f9fa] px-3 py-4 text-[#212529]"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <ReturnToDashboardButton onClick={() => navigate('/home')} />

        <section className="rounded-2xl rounded-tr-none border border-[#d7e0da] bg-[linear-gradient(135deg,#00441b_0%,#1a5e20_72%,#4c9a2a_100%)] p-5 text-white shadow-[0_12px_28px_rgba(0,68,27,0.18)]">
          <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs font-black uppercase tracking-[0.16em]">
            Citizen Submission
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">Submit Environmental Report</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/90">
            Add the report title, description, location, evidence, and identity choice.
          </p>
        </section>

        {message && (
          <div
            className={`rounded-[22px] rounded-tr-[10px] border px-4 py-3 text-sm font-semibold ${
              message.type === 'success'
                ? 'border-[#b9d7b3] bg-[#eef6ea] text-[#1a5e20]'
                : 'border-[#e0b4aa] bg-[#fff3f0] text-[#8a2f20]'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-3 lg:grid-cols-[1.35fr_0.8fr]">
          <div className="space-y-3">
            <SectionShell title="Report Details">
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[#212529]">Title</label>
                  <select
                    value={formData.violationType}
                    onChange={(e) => setFormData((current) => ({ ...current, violationType: e.target.value }))}
                    className={`${inputClass} ${fieldHasError(hasTitle) ? invalidInputClass : ''}`}
                  >
                    <option>Illegal Cutting (Section 77)</option>
                    <option>Illegal Occupation (Section 78)</option>
                    <option>Chainsaw Act (RA 9175)</option>
                    <option>Mining Act (RA 9275)</option>
                    <option>Wildlife (RA 9147)</option>
                    <option>Others</option>
                  </select>
                  {fieldHasError(hasTitle) && <p className="mt-2 text-xs font-semibold text-[#b33a2e]">Title is required.</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[#212529]">Date Submitted</label>
                  <input
                    type="date"
                    required
                    readOnly
                    value={formData.reportDate}
                    className={`${inputClass} cursor-not-allowed bg-[#eef6ea] ${fieldHasError(hasDate) ? invalidInputClass : ''}`}
                  />
                  <p className="mt-2 text-xs font-semibold text-[#6c757d]">Automatically set to today.</p>
                  {fieldHasError(hasDate) && <p className="mt-2 text-xs font-semibold text-[#b33a2e]">Date is required.</p>}
                </div>

                <div className={fieldHasError(hasDescription) ? 'rounded-xl rounded-tr-none border border-[#d56b5f] p-1' : ''}>
                  <DescriptionSuggestions
                    description={formData.description}
                    violationType={formData.violationType}
                    location={formData.manualLocation}
                    setDescription={(desc) => setFormData((current) => ({ ...current, description: desc }))}
                  />
                </div>
                {fieldHasError(hasDescription) && <p className="text-xs font-semibold text-[#b33a2e]">Description is required.</p>}
              </div>
            </SectionShell>

            <SectionShell icon={<Icon type="location" />} title="Location">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={captureLocation}
                  className="min-h-12 rounded-full border border-[#003915] bg-[#00441b] px-4 text-sm font-black text-white shadow-[0_3px_0_#003915] transition active:translate-y-[2px] active:shadow-[0_1px_0_#003915]"
                >
                  Use GPS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLocationMode('manual')
                    document.getElementById('manualLocation')?.focus()
                  }}
                  className="min-h-12 rounded-full border border-[#cfd8d3] bg-white px-4 text-sm font-black text-[#1a5e20] shadow-[0_3px_0_#cfd8d3] transition active:translate-y-[2px] active:shadow-[0_1px_0_#cfd8d3]"
                >
                  Enter Manually
                </button>
              </div>

              {formData.latitude && formData.longitude && (
                <p className="mt-3 rounded-xl rounded-tr-none border border-[#b9d7b3] bg-[#eef6ea] px-4 py-3 text-sm font-semibold text-[#1a5e20]">
                  GPS Location: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                </p>
              )}

              {locationMode !== 'gps' ? (
                <input
                  id="manualLocation"
                  type="text"
                  placeholder="Sitio, barangay, or landmark"
                  value={formData.manualLocation}
                  onChange={(e) => {
                    setLocationMode('manual')
                    setFormData((current) => ({ ...current, manualLocation: e.target.value }))
                  }}
                  className={`mt-3 ${inputClass} ${fieldHasError(hasLocation) ? invalidInputClass : ''}`}
                  aria-invalid={fieldHasError(hasLocation)}
                />
              ) : null}
              {fieldHasError(hasLocation) && <p className="mt-2 text-xs font-semibold text-[#b33a2e]">Location is required. Use GPS or enter a manual location.</p>}
            </SectionShell>

            <SectionShell icon={<Icon type="media" />} title="Evidence">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const items = Array.from(e.dataTransfer.files || [])
                  if (items.length) setMediaFiles((cur) => [...cur, ...items].slice(0, 8))
                }}
                className="rounded-xl rounded-tl-none border border-dashed border-[#cfd8d3] bg-[#f8f9fa] p-5 text-center text-sm text-[#495057]"
              >
                <p className="font-black text-[#212529]">Add photos or videos</p>
                <p className="mt-1 text-xs font-semibold">Maximum 8 files.</p>
                <input
                  id="mediaInput"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    if (files.length) setMediaFiles((cur) => [...cur, ...files].slice(0, 8))
                    e.target.value = ''
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('mediaInput').click()}
                  className="mt-3 inline-flex min-h-12 items-center rounded-full border border-[#cfd8d3] bg-white px-5 text-sm font-black text-[#1a5e20] shadow-[0_3px_0_#cfd8d3] transition active:translate-y-[2px] active:shadow-[0_1px_0_#cfd8d3]"
                >
                  Choose Files
                </button>

                {mediaFiles.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {mediaFiles.map((file, idx) => (
                      <div key={`${file.name}-${idx}`} className="relative overflow-hidden rounded-xl rounded-tr-none border border-[#d7e0da] bg-white p-1 text-center">
                        {file.type.startsWith('image/') ? (
                          <img src={URL.createObjectURL(file)} alt={file.name} className="h-20 w-full rounded-[14px] object-cover" />
                        ) : (
                          <div className="flex h-20 items-center justify-center rounded-lg bg-[#f8f9fa] text-xs font-black text-[#495057]">Video</div>
                        )}
                        <button
                          type="button"
                          onClick={() => setMediaFiles((cur) => cur.filter((_, i) => i !== idx))}
                          className="absolute right-1 top-1 rounded-full bg-[#1a5e20] px-2 py-1 text-[10px] font-black text-white"
                          aria-label="Remove file"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionShell>
          </div>

          <aside className="space-y-3">
            <section className="rounded-2xl rounded-tl-none border border-[#d7e0da] bg-white p-4 shadow-[0_8px_18px_rgba(0,68,27,0.08)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1a5e20]">Reporter</p>
              <div className="mt-3 rounded-xl rounded-tr-none border border-[#d7e0da] bg-[#f8f9fa] p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#6c757d]">Phone Number</p>
                <p className="mt-1 text-lg font-black text-[#00441b]">{user?.phone || 'No phone number available'}</p>
              </div>
            </section>

            <section className="rounded-2xl rounded-tr-none border border-[#d7e0da] bg-white p-4 shadow-[0_8px_18px_rgba(0,68,27,0.08)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1a5e20]">Submission Toggle</p>
              {fieldHasError(hasIdentitySelection) && (
                <p className="mt-2 rounded-xl rounded-tr-none border border-[#d56b5f] bg-[#fff8f7] px-3 py-2 text-xs font-semibold text-[#b33a2e]">
                  Select Named Submission or Anonymous Name before submitting.
                </p>
              )}
              <div className="mt-3 grid gap-3">
                <button
                  type="button"
                  onClick={() => setFormData((current) => ({ ...current, anonymous: false }))}
                  className={`min-h-24 rounded-xl rounded-tr-none border-2 p-4 text-left transition active:translate-y-[1px] ${
                    formData.anonymous === false
                      ? 'border-[#00441b] bg-[#eef6ea] text-[#212529] shadow-[inset_0_3px_8px_rgba(0,68,27,0.18),0_0_0_2px_rgba(76,154,42,0.18)]'
                      : fieldHasError(hasIdentitySelection)
                        ? 'border-[#d56b5f] bg-[#fff8f7] text-[#495057] shadow-[0_3px_0_#e0b4aa]'
                        : 'border-[#cfd8d3] bg-white text-[#495057] shadow-[0_3px_0_#cfd8d3]'
                  }`}
                >
                  <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl rounded-br-none bg-[#00441b] text-white">
                    <Icon type="user" />
                  </span>
                  <span className="block font-black">Named Submission</span>
                  <span className="mt-1 block text-sm leading-5">Your account remains linked for DENR review.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData((current) => ({ ...current, anonymous: true }))}
                  className={`min-h-24 rounded-xl rounded-tl-none border-2 p-4 text-left transition active:translate-y-[1px] ${
                    formData.anonymous === true
                      ? 'border-[#1a5e20] bg-[#eef6ea] text-[#212529] shadow-[inset_0_3px_8px_rgba(0,68,27,0.18),0_0_0_2px_rgba(76,154,42,0.18)]'
                      : fieldHasError(hasIdentitySelection)
                        ? 'border-[#d56b5f] bg-[#fff8f7] text-[#495057] shadow-[0_3px_0_#e0b4aa]'
                        : 'border-[#cfd8d3] bg-white text-[#495057] shadow-[0_3px_0_#cfd8d3]'
                  }`}
                >
                  <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl rounded-br-none bg-[#4c9a2a] text-white">
                    <Icon type="hidden" />
                  </span>
                  <span className="block font-black">Anonymous Name</span>
                  <span className="mt-1 block text-sm leading-5">Your name is hidden in report display.</span>
                </button>
              </div>
            </section>

            <div className="relative">
              <button
                type="submit"
                disabled={loading || !isFormValid}
                className="flex min-h-14 w-full items-center justify-center rounded-full border border-[#003915] bg-[linear-gradient(180deg,#1a5e20_0%,#00441b_100%)] px-6 text-base font-black text-white shadow-[0_4px_0_#003915,0_10px_22px_rgba(0,68,27,0.2)] transition active:translate-y-[2px] active:shadow-[0_2px_0_#003915,0_6px_14px_rgba(0,68,27,0.18)] disabled:cursor-not-allowed disabled:border-[#a8b3ad] disabled:bg-none disabled:bg-[#cfd8d3] disabled:text-[#6c757d] disabled:shadow-none"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
              {!isFormValid && !loading && (
                <button
                  type="button"
                  aria-label="Show required fields"
                  onClick={() => {
                    setSubmitAttempted(true)
                    setMessage({ type: 'error', text: 'Complete all required fields before submitting the report.' })
                  }}
                  className="absolute inset-0 rounded-full"
                />
              )}
            </div>
          </aside>
        </form>
      </div>
    </div>
  )
}
