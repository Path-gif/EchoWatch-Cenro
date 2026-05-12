import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import { CircleMarker, MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../lib/api'
import { normalizeUser, toDisplayText } from '../lib/text'
import DescriptionSuggestions from '../components/DescriptionSuggestions'

const inputClass =
  'min-h-12 w-full rounded-xl rounded-tr-none border border-[#cfd8d3] bg-white px-4 py-3 text-[#212529] shadow-[inset_0_2px_6px_rgba(0,68,27,0.08)] outline-none transition placeholder:text-[#6c757d] focus:border-[#1a5e20] focus:ring-3 focus:ring-[#4c9a2a]/20'

const invalidInputClass =
  'border-[#d56b5f] bg-[#fff8f7] focus:border-[#b33a2e] focus:ring-[#d56b5f]/20'

const DEFAULT_MAP_CENTER = [14.8799, 120.2312]
const COVERAGE_BOUNDS = [
  [14.75, 119.98],
  [15.24, 120.36],
]
const COVERAGE_MUNICIPALITIES = [
  { name: 'Olongapo', latitude: 14.8386, longitude: 120.2842 },
  { name: 'Subic', latitude: 14.8799, longitude: 120.2312 },
  { name: 'San Marcelino', latitude: 14.9742, longitude: 120.1579 },
  { name: 'San Antonio', latitude: 14.9471, longitude: 120.0897 },
  { name: 'San Narciso', latitude: 15.0167, longitude: 120.0833 },
  { name: 'San Felipe', latitude: 15.0622, longitude: 120.0708 },
  { name: 'Cabangan', latitude: 15.1673, longitude: 120.0334 },
]

const pinIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width: 42px;
      height: 42px;
      border-radius: 9999px 9999px 9999px 0;
      background: #00441b;
      border: 4px solid #ffffff;
      box-shadow: 0 12px 24px rgba(0, 68, 27, 0.28);
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 12px;
        height: 12px;
        border-radius: 9999px;
        background: #e5c76b;
        transform: rotate(45deg);
      "></div>
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 42],
})

function readUser() {
  try {
    return normalizeUser(JSON.parse(localStorage.getItem('user') || 'null'))
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

function isInsideCoverage(latitude, longitude) {
  return (
    latitude >= COVERAGE_BOUNDS[0][0] &&
    latitude <= COVERAGE_BOUNDS[1][0] &&
    longitude >= COVERAGE_BOUNDS[0][1] &&
    longitude <= COVERAGE_BOUNDS[1][1]
  )
}

function LocationPicker({ latitude, longitude, onReject, onSelect }) {
  const selectedPosition = latitude != null && longitude != null ? [latitude, longitude] : null

  function selectIfAllowed(nextLatitude, nextLongitude) {
    if (!isInsideCoverage(nextLatitude, nextLongitude)) {
      onReject()
      return
    }
    onSelect(nextLatitude, nextLongitude)
  }

  function MapClickHandler() {
    useMapEvents({
      click(event) {
        selectIfAllowed(event.latlng.lat, event.latlng.lng)
      },
    })
    return null
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl rounded-tr-none border border-[#cfd8d3] bg-white shadow-[0_8px_18px_rgba(0,68,27,0.08)]">
      <div className="flex flex-col gap-1 border-b border-[#d7e0da] bg-[#f8f9fa] px-4 py-3">
        <p className="text-sm font-black text-[#00441b]">Pin exact location</p>
        <p className="text-xs font-semibold text-[#6c757d]">Tap within Olongapo, Subic, San Marcelino, San Antonio, San Narciso, San Felipe, or Cabangan.</p>
      </div>
      <MapContainer
        center={selectedPosition || DEFAULT_MAP_CENTER}
        zoom={selectedPosition ? 16 : 11}
        maxBounds={COVERAGE_BOUNDS}
        maxBoundsViscosity={1}
        scrollWheelZoom
        className="h-[280px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler />
        {COVERAGE_MUNICIPALITIES.map((municipality) => (
          <CircleMarker
            key={municipality.name}
            center={[municipality.latitude, municipality.longitude]}
            radius={7}
            pathOptions={{ color: '#00441b', fillColor: '#e5c76b', fillOpacity: 0.95, weight: 2 }}
          />
        ))}
        {selectedPosition ? (
          <Marker
            position={selectedPosition}
            icon={pinIcon}
            draggable
            eventHandlers={{
              dragend(event) {
                const nextPosition = event.target.getLatLng()
                selectIfAllowed(nextPosition.lat, nextPosition.lng)
              },
            }}
          />
        ) : null}
      </MapContainer>
    </div>
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
  const hasLocation = formData.latitude != null && formData.longitude != null
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
      setMessage({ type: 'error', text: 'Complete all required fields and pin a valid report location before submitting.' })
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

      setMessage({ type: 'success', text: `Report submitted. Reference: ${toDisplayText(response.data.reference_number, 'Pending reference')}` })
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
      setMessage({ type: 'error', text: toDisplayText(error?.response?.data?.error, 'Failed to submit report. Please try again.') })
    } finally {
      setLoading(false)
    }
  }

  const captureLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isInsideCoverage(position.coords.latitude, position.coords.longitude)) {
          setLocationMode('gps')
          setMessage({
            type: 'error',
            text: 'Your GPS location is outside the supported area. Reports are limited to Olongapo, Subic, San Marcelino, San Antonio, San Narciso, San Felipe, and Cabangan.',
          })
          return
        }
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
        setMessage({ type: 'error', text: `Failed to capture location: ${toDisplayText(error.message, 'Location unavailable')}` })
      }
    )
  }

  function handleManualPin(latitude, longitude) {
    if (!isInsideCoverage(latitude, longitude)) {
      setMessage({
        type: 'error',
        text: 'Pin must be inside Olongapo, Subic, San Marcelino, San Antonio, San Narciso, San Felipe, or Cabangan.',
      })
      return
    }

    const nextLatitude = Number(latitude.toFixed(8))
    const nextLongitude = Number(longitude.toFixed(8))
    setLocationMode('manual')
    setFormData((current) => ({
      ...current,
      latitude: nextLatitude,
      longitude: nextLongitude,
      manualLocation:
        current.manualLocation && !current.manualLocation.startsWith('Pinned location:')
          ? current.manualLocation
          : `Pinned location: ${nextLatitude.toFixed(6)}, ${nextLongitude.toFixed(6)}`,
    }))
  }

  return (
    <div
      className="min-h-[calc(100vh-88px)] bg-[#f8f9fa] px-3 py-4 text-[#212529]"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div className="mx-auto w-full max-w-5xl space-y-3">
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
                    window.setTimeout(() => document.getElementById('manualLocation')?.focus(), 0)
                  }}
                  className="min-h-12 rounded-full border border-[#cfd8d3] bg-white px-4 text-sm font-black text-[#1a5e20] shadow-[0_3px_0_#cfd8d3] transition active:translate-y-[2px] active:shadow-[0_1px_0_#cfd8d3]"
                >
                  Enter Manually
                </button>
              </div>

              {locationMode === 'gps' && formData.latitude && formData.longitude && (
                <p className="mt-3 rounded-xl rounded-tr-none border border-[#b9d7b3] bg-[#eef6ea] px-4 py-3 text-sm font-semibold text-[#1a5e20]">
                  GPS Location: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                </p>
              )}

              {locationMode !== 'gps' ? (
                <>
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

                  <LocationPicker
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    onReject={() =>
                      setMessage({
                        type: 'error',
                        text: 'Pin must be inside Olongapo, Subic, San Marcelino, San Antonio, San Narciso, San Felipe, or Cabangan.',
                      })
                    }
                    onSelect={handleManualPin}
                  />

                  {formData.latitude != null && formData.longitude != null ? (
                    <p className="mt-3 rounded-xl rounded-tr-none border border-[#b9d7b3] bg-[#eef6ea] px-4 py-3 text-sm font-semibold text-[#1a5e20]">
                      Selected pin: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                    </p>
                  ) : null}
                </>
              ) : null}
              {fieldHasError(hasLocation) && <p className="mt-2 text-xs font-semibold text-[#b33a2e]">Location is required. Use GPS or pin a location inside the supported area.</p>}
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
                    setMessage({ type: 'error', text: 'Complete all required fields and pin a valid report location before submitting.' })
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
