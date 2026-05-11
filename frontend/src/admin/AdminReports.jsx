import React, { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../lib/api'
import { toDisplayText } from '../lib/text'

const REFRESH_INTERVAL_MS = 15000
const DEFAULT_CENTER = [14.987, 120.105]
const DEFAULT_ZOOM = 10

const MUNICIPALITIES = [
  { name: 'Olongapo', latitude: 14.8386, longitude: 120.2842 },
  { name: 'Subic', latitude: 14.8799, longitude: 120.2312 },
  { name: 'San Marcelino', latitude: 14.9742, longitude: 120.1579 },
  { name: 'San Antonio', latitude: 14.9471, longitude: 120.0897 },
  { name: 'San Narciso', latitude: 15.0167, longitude: 120.0833 },
  { name: 'San Felipe', latitude: 15.0622, longitude: 120.0708 },
  { name: 'Cabangan', latitude: 15.1673, longitude: 120.0334 },
]

function getReportCountColor(count) {
  if (count >= 20) return '#dc2626'
  if (count >= 10) return '#d6b44c'
  if (count >= 1) return '#1f6a53'
  return '#d8e0db'
}

function createMunicipalityIcon(count) {
  const color = getReportCountColor(count)
  const label = count > 99 ? '99+' : String(count)

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 46px;
        height: 46px;
        border-radius: 9999px;
        background: ${color};
        color: ${count === 0 ? '#4b5563' : '#ffffff'};
        border: 4px solid #ffffff;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.24);
        display: flex;
        align-items: center;
        justify-content: center;
        font: 900 13px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">${label}</div>
    `,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -22],
  })
}

function formatTimestamp(value) {
  if (!value) return 'No timestamp'

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function normalizeMediaUrl(url) {
  if (!url) return ''
  if (/^(https?:|blob:)/i.test(url)) return url

  const baseURL = api.defaults.baseURL || ''
  return `${baseURL}${url.startsWith('/') ? '' : '/'}${url}`
}

function EvidencePreview({ report }) {
  const image = (report.evidence_media || []).find((media) => media.is_image && media.url)
  if (!image) return <span className="text-sm text-slate-400">No photo</span>

  const imageUrl = normalizeMediaUrl(image.url)
  return (
    <a href={imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3">
      <img src={imageUrl} alt={`Evidence for ${toDisplayText(report.reference_number, 'report')}`} className="h-14 w-16 rounded-lg border border-[#dbe4df] object-cover shadow-sm" />
      <span className="text-sm font-semibold text-[#0f5f46] hover:underline">View photo</span>
    </a>
  )
}

function OverviewMap({ municipalityCounts }) {
  const countByMunicipality = municipalityCounts.reduce((groups, item) => {
    groups[item.municipality] = Number(item.count) || 0
    return groups
  }, {})

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom className="h-[320px] w-full sm:h-[420px]">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {MUNICIPALITIES.map((municipality) => {
        const count = countByMunicipality[municipality.name] || 0
        return (
          <Marker key={municipality.name} position={[municipality.latitude, municipality.longitude]} icon={createMunicipalityIcon(count)}>
            <Popup>
              <div className="min-w-[180px] text-sm text-slate-700">
                <p className="font-bold text-slate-900">{municipality.name}</p>
                <p className="mt-1">{count} reported case{count === 1 ? '' : 's'}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {count >= 20 ? 'High alert' : count >= 10 ? 'Moderate watch' : count >= 1 ? 'Active reports' : 'No reported cases'}
                </p>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}

function DetailField({ label, children }) {
  return (
    <div className="rounded-[1.05rem] border border-[#dbe4df] bg-[#f8fbf9] px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46]">{label}</p>
      <div className="mt-2 text-sm leading-6 text-slate-700">{children}</div>
    </div>
  )
}

export default function AdminReports() {
  const [overview, setOverview] = useState({ generated_at: null, municipality_counts: [], reports: [] })
  const [selectedReportId, setSelectedReportId] = useState(null)
  const [municipalityFilter, setMunicipalityFilter] = useState('all')
  const [caseFilter, setCaseFilter] = useState('all')
  const [referenceSearch, setReferenceSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function fetchOverview({ silent = false } = {}) {
      if (!silent) setLoading(true)

      try {
        const response = await api.get('/admin/reports/overview')
        if (!isMounted) return

        setOverview({
          generated_at: response.data.generated_at,
          municipality_counts: Array.isArray(response.data.municipality_counts) ? response.data.municipality_counts : [],
          reports: Array.isArray(response.data.reports) ? response.data.reports : [],
        })
        setMessage(null)
      } catch (error) {
        if (isMounted) setMessage(toDisplayText(error?.response?.data?.error, 'Unable to load reports.'))
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchOverview()
    const intervalId = window.setInterval(() => fetchOverview({ silent: true }), REFRESH_INTERVAL_MS)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  const caseOptions = useMemo(() => {
    return Array.from(new Set(overview.reports.map((report) => toDisplayText(report.violation_type)).filter(Boolean))).sort()
  }, [overview.reports])

  const filteredReports = useMemo(() => {
    const query = referenceSearch.trim().toLowerCase()

    return overview.reports.filter((report) => {
      const matchesMunicipality = municipalityFilter === 'all' || toDisplayText(report.municipality) === municipalityFilter
      const matchesCase = caseFilter === 'all' || toDisplayText(report.violation_type) === caseFilter
      const matchesReference = !query || toDisplayText(report.reference_number).toLowerCase().includes(query)
      return matchesMunicipality && matchesCase && matchesReference
    })
  }, [caseFilter, municipalityFilter, overview.reports, referenceSearch])

  const selectedReport = useMemo(() => {
    return overview.reports.find((report) => report.id === selectedReportId) || null
  }, [overview.reports, selectedReportId])

  useEffect(() => {
    if (selectedReportId && !overview.reports.some((report) => report.id === selectedReportId)) {
      setSelectedReportId(null)
    }
  }, [overview.reports, selectedReportId])

  async function handleMarkReportDone(reportId) {
    try {
      const response = await api.patch(`/admin/reports/${reportId}/status`, {
        status: 'resolved',
        notes: 'Reported activity has been completed by DENR review.',
      })
      const updatedReport = response.data?.report
      setOverview((prev) => ({
        ...prev,
        reports: prev.reports.map((report) =>
          report.id === reportId
            ? {
                ...report,
                status: updatedReport?.status || 'resolved',
                resolution_date: updatedReport?.resolution_date || new Date().toISOString(),
                resolution_notes: updatedReport?.resolution_notes || 'Reported activity has been completed by DENR review.',
              }
            : report
        ),
      }))
      setMessage('Report marked done. The citizen will see a notification.')
    } catch (error) {
      setMessage(toDisplayText(error?.response?.data?.error, 'Failed to mark report done.'))
    }
  }

  async function handleDeleteReport(reportId) {
    if (!confirm('Are you sure you want to delete this report?')) return

    try {
      await api.delete(`/admin/reports/${reportId}`)
      setOverview((prev) => ({
        ...prev,
        reports: prev.reports.filter((report) => report.id !== reportId),
      }))
      if (selectedReportId === reportId) setSelectedReportId(null)
      setMessage('Report deleted successfully.')
    } catch (error) {
      setMessage(toDisplayText(error?.response?.data?.error, 'Failed to delete report.'))
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-[1.25rem] border border-[#d6dfd9] bg-white p-4 shadow-sm sm:rounded-[1.6rem] sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0f5f46] sm:text-[11px] sm:tracking-[0.22em]">Reports Workspace</p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-[#123629] sm:text-3xl">Reported Cases</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Review reported areas, filter by municipality and reported case, and search by citizen reference code.
            </p>
          </div>
          <div className="rounded-2xl border border-[#d8e0db] bg-[#f7faf8] px-4 py-3 text-sm text-slate-600 lg:min-w-56">
            <p className="font-semibold text-slate-900">Auto-refresh</p>
            <p>Every 15 seconds</p>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-[#cfe0d7] bg-[#f4faf7] px-5 py-4 text-sm font-semibold text-[#123629]">
          {toDisplayText(message)}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-[1.25rem] border border-[#d6dfd9] bg-white shadow-sm sm:rounded-[1.7rem]">
          <div className="border-b border-[#e5ece8] px-4 py-4 sm:px-6 sm:py-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46]">Interactive Map</p>
            <h3 className="mt-2 text-xl font-black text-[#123629] sm:text-2xl">Reported Areas</h3>
            <p className="mt-2 text-sm text-slate-600">
              Municipal markers show total reported cases for Olongapo, Subic, San Marcelino, San Antonio, San Narciso, San Felipe, and Cabangan.
            </p>
          </div>
          <div className="bg-[#eef3f0]">
            {loading ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-slate-500 sm:h-[420px]">Loading municipal markers...</div>
            ) : (
              <OverviewMap municipalityCounts={overview.municipality_counts} />
            )}
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-[#d6dfd9] bg-white p-4 shadow-sm sm:rounded-[1.7rem] sm:p-6">
          <div className="border-b border-[#e5ece8] pb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46]">Case Details</p>
            <h3 className="mt-2 break-words text-xl font-black text-[#123629] sm:text-2xl">
              {selectedReport ? toDisplayText(selectedReport.reference_number, 'No reference number') : 'Select a case'}
            </h3>
          </div>

          {selectedReport ? (
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => setSelectedReportId(null)}
                className="inline-flex min-h-10 items-center rounded-full border border-[#cfd8d3] bg-white px-4 text-sm font-black text-[#1a5e20] shadow-[0_2px_0_#cfd8d3]"
              >
                Clear details
              </button>
              <DetailField label="Submitted By">
                <div className="flex flex-col gap-1">
                  <span className="font-black text-[#123629]">{toDisplayText(selectedReport.submitter_name, 'Unknown submitter')}</span>
                  <span>{toDisplayText(selectedReport.phone, 'No phone number')}</span>
                </div>
              </DetailField>
              <DetailField label="Municipality">{toDisplayText(selectedReport.municipality, 'Unknown municipality')}</DetailField>
              <DetailField label="Violation Type">{toDisplayText(selectedReport.violation_type, 'Untitled report')}</DetailField>
              <DetailField label="Evidence Photo"><EvidencePreview report={selectedReport} /></DetailField>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailField label="Latitude">{selectedReport.latitude ?? 'Not available'}</DetailField>
                <DetailField label="Longitude">{selectedReport.longitude ?? 'Not available'}</DetailField>
              </div>
              <DetailField label="Location Source">{toDisplayText(selectedReport.manual_location, 'Coordinate-only report')}</DetailField>
              <DetailField label="Description">{toDisplayText(selectedReport.description, 'Not available')}</DetailField>
              <DetailField label="Timestamp">{formatTimestamp(selectedReport.created_at)}</DetailField>
            </div>
          ) : (
            <div className="mt-5 rounded-[1.05rem] border border-dashed border-[#ccd7d1] bg-[#f8fbf9] px-4 py-8 text-sm text-slate-500">
              Click View Details on a reported case to see the full case information here.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[1.25rem] border border-[#d6dfd9] bg-white shadow-sm sm:rounded-[1.7rem]">
        <div className="border-b border-[#e5ece8] px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46]">Reports Table</p>
          <h3 className="mt-2 text-xl font-black text-[#123629] sm:text-2xl">Municipality Report Entries</h3>

          <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_13rem_16rem_auto]">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Search reference code</span>
              <input
                type="search"
                value={referenceSearch}
                onChange={(event) => setReferenceSearch(event.target.value)}
                placeholder="Example: OLO-2026-0001"
                className="min-h-12 rounded-xl border border-[#cfd8d3] bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-[#0f5f46] focus:ring-2 focus:ring-[#0f5f46]/15"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Municipality</span>
              <select
                value={municipalityFilter}
                onChange={(event) => setMunicipalityFilter(event.target.value)}
                className="min-h-12 rounded-xl border border-[#cfd8d3] bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-[#0f5f46] focus:ring-2 focus:ring-[#0f5f46]/15"
              >
                <option value="all">All municipalities</option>
                {MUNICIPALITIES.map((municipality) => (
                  <option key={municipality.name} value={municipality.name}>{municipality.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Reported case</span>
              <select
                value={caseFilter}
                onChange={(event) => setCaseFilter(event.target.value)}
                className="min-h-12 rounded-xl border border-[#cfd8d3] bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-[#0f5f46] focus:ring-2 focus:ring-[#0f5f46]/15"
              >
                <option value="all">All cases</option>
                {caseOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                setReferenceSearch('')
                setMunicipalityFilter('all')
                setCaseFilter('all')
              }}
              className="min-h-12 self-end rounded-xl border border-[#cfd8d3] bg-white px-5 text-sm font-black text-[#1a5e20] shadow-[0_2px_0_#cfd8d3]"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {filteredReports.length === 0 ? (
            <div className="rounded-[1.05rem] border border-dashed border-[#ccd7d1] bg-[#f8fbf9] px-4 py-8 text-center text-sm text-slate-500">
              No reports match the current filters.
            </div>
          ) : (
            filteredReports.map((report) => (
              <article key={report.id} className="rounded-[1.05rem] border border-[#dbe4df] bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-base font-black text-[#123629]">{toDisplayText(report.reference_number, 'No reference number')}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{toDisplayText(report.municipality, 'Unknown municipality')}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedReportId(report.id)} className="rounded-full border border-[#003915] bg-[#00441b] px-4 py-2 text-sm font-black text-white">
                    View Details
                  </button>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700">{toDisplayText(report.violation_type, 'Untitled report')}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{toDisplayText(report.description, 'Not available')}</p>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-[#e5ece8]">
            <thead className="bg-[#f7faf8]">
              <tr className="text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-600">
                <th className="px-6 py-4">Reference Code</th>
                <th className="px-6 py-4">Case</th>
                <th className="px-6 py-4">Municipality</th>
                <th className="px-6 py-4">Submitter</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2ef] bg-white">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-sm text-slate-500">No reports match the current filters.</td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className={selectedReportId === report.id ? 'bg-[#f3f7f5]' : 'hover:bg-[#fafcfb]'}>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{toDisplayText(report.reference_number, 'No reference number')}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{toDisplayText(report.violation_type, 'Untitled report')}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{toDisplayText(report.municipality, 'Unknown municipality')}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <span className="block font-semibold text-slate-900">{toDisplayText(report.submitter_name, 'Unknown submitter')}</span>
                      <span className="text-slate-500">{toDisplayText(report.phone, 'No phone number')}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{formatTimestamp(report.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setSelectedReportId(report.id)} className="rounded-full border border-[#003915] bg-[#00441b] px-4 py-2 text-sm font-black text-white">
                          View Details
                        </button>
                        <button type="button" disabled={report.status === 'resolved'} onClick={() => handleMarkReportDone(report.id)} className="rounded-full border border-[#cfd8d3] bg-white px-4 py-2 text-sm font-black text-[#1a5e20] disabled:cursor-not-allowed disabled:text-slate-400">
                          Mark Done
                        </button>
                        <button type="button" onClick={() => handleDeleteReport(report.id)} className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
