import React, { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../lib/api'
import { toDisplayText } from '../lib/text'

const REFRESH_INTERVAL_MS = 15000
const DEFAULT_CENTER = [14.987, 120.105]
const DEFAULT_ZOOM = 10
const CLUSTER_MIN_REPORTS = 3
const CLUSTER_EXPAND_ZOOM = 13

const MUNICIPALITIES = [
  { name: 'Olongapo', latitude: 14.8386, longitude: 120.2842 },
  { name: 'Subic', latitude: 14.8799, longitude: 120.2312 },
  { name: 'San Marcelino', latitude: 14.9742, longitude: 120.1579 },
  { name: 'San Antonio', latitude: 14.9471, longitude: 120.0897 },
  { name: 'San Narciso', latitude: 15.0167, longitude: 120.0833 },
  { name: 'San Felipe', latitude: 15.0622, longitude: 120.0708 },
  { name: 'Cabangan', latitude: 15.1673, longitude: 120.0334 },
]

const REPORTED_CASES = [
  'Illegal Cutting (Section 77)',
  'Illegal Occupation (Section 78)',
  'Chainsaw Act (RA 9175)',
  'Mining Act (RA 9275)',
  'Wildlife (RA 9147)',
]

function getReportCountColor(count) {
  if (count >= 20) return '#dc2626'
  if (count >= 10) return '#d6b44c'
  if (count >= 1) return '#1f6a53'
  return '#d8e0db'
}

function createReportDotIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 18px;
        height: 18px;
        border-radius: 9999px;
        background: #0f5f46;
        border: 4px solid #ffffff;
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.28);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  })
}

function createReportClusterIcon(count) {
  const color = getReportCountColor(count)

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 42px;
        height: 42px;
        border-radius: 9999px;
        display: grid;
        place-items: center;
        background: ${color};
        border: 5px solid #ffffff;
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.3);
        color: #ffffff;
        font: 800 14px/1 system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">${count}</div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -21],
  })
}

function formatTimestamp(value) {
  if (!value) return 'No timestamp'

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getLocalDateKey(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getStartOfWeek(value) {
  const date = new Date(value)
  const day = date.getDay()
  const daysSinceMonday = day === 0 ? 6 : day - 1
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - daysSinceMonday)
  return date
}

function escapeExcelCell(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeMediaUrl(url) {
  if (!url) return ''
  if (/^(https?:|blob:)/i.test(url)) return url

  const baseURL = api.defaults.baseURL || ''
  return `${baseURL}${url.startsWith('/') ? '' : '/'}${url}`
}

function getReportPosition(report) {
  const latitude = Number(report.latitude)
  const longitude = Number(report.longitude)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return [latitude, longitude]
}

function getClusterCenter(reports) {
  const totals = reports.reduce((sum, report) => {
    sum.latitude += report.position[0]
    sum.longitude += report.position[1]
    return sum
  }, { latitude: 0, longitude: 0 })

  return [totals.latitude / reports.length, totals.longitude / reports.length]
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

function MapReportMarkers({ groupedReports, onSelectReport }) {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())

  useEffect(() => {
    function handleZoomEnd() {
      setZoom(map.getZoom())
    }

    map.on('zoomend', handleZoomEnd)
    return () => map.off('zoomend', handleZoomEnd)
  }, [map])

  return groupedReports.flatMap((group) => {
    const shouldCluster = group.reports.length >= CLUSTER_MIN_REPORTS && zoom < CLUSTER_EXPAND_ZOOM

    if (shouldCluster) {
      const center = getClusterCenter(group.reports)
      return (
        <Marker
          key={`${group.municipality}-cluster`}
          position={center}
          icon={createReportClusterIcon(group.reports.length)}
          eventHandlers={{
            click: () => map.setView(center, CLUSTER_EXPAND_ZOOM, { animate: true }),
          }}
        >
          <Popup>
            <div className="min-w-[190px] text-sm text-slate-700">
              <p className="font-bold text-slate-900">{group.municipality}</p>
              <p className="mt-1">{group.reports.length} mapped reports</p>
              <p className="mt-1 text-xs text-slate-500">Zoom in to view individual report dots.</p>
            </div>
          </Popup>
        </Marker>
      )
    }

    return group.reports.map((report) => (
      <Marker
        key={report.id || `${group.municipality}-${report.position.join(',')}`}
        position={report.position}
        icon={createReportDotIcon()}
        eventHandlers={{ click: () => onSelectReport(report.id) }}
      >
        <Popup>
          <div className="min-w-[190px] text-sm text-slate-700">
            <p className="font-bold text-slate-900">{toDisplayText(report.reference_number, 'Report')}</p>
            <p className="mt-1">{toDisplayText(report.violation_type, 'Untitled report')}</p>
            <p className="mt-1 text-xs text-slate-500">{group.municipality}</p>
            <button
              type="button"
              onClick={() => onSelectReport(report.id)}
              className="mt-3 rounded-full border border-[#cfd8d3] bg-white px-3 py-1.5 text-xs font-black text-[#0f5f46]"
            >
              View details
            </button>
          </div>
        </Popup>
      </Marker>
    ))
  })
}

function OverviewMap({ reports, onSelectReport }) {
  const supportedMunicipalities = useMemo(() => new Set(MUNICIPALITIES.map((municipality) => municipality.name)), [])
  const groupedReports = useMemo(() => {
    const groups = MUNICIPALITIES.map((municipality) => ({
      municipality: municipality.name,
      reports: [],
    }))
    const groupByName = groups.reduce((lookup, group) => {
      lookup[group.municipality] = group
      return lookup
    }, {})

    reports.forEach((report) => {
      const municipality = toDisplayText(report.municipality)
      const position = getReportPosition(report)
      if (!supportedMunicipalities.has(municipality) || !position) return

      groupByName[municipality].reports.push({ ...report, position })
    })

    return groups.filter((group) => group.reports.length > 0)
  }, [reports, supportedMunicipalities])

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom className="h-[320px] w-full sm:h-[420px]">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapReportMarkers groupedReports={groupedReports} onSelectReport={onSelectReport} />
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
  const [dateFilter, setDateFilter] = useState('')
  const [referenceSearch, setReferenceSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [actionReport, setActionReport] = useState(null)
  const [actionNotes, setActionNotes] = useState('')
  const [savingAction, setSavingAction] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)

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

  const filteredReports = useMemo(() => {
    const query = referenceSearch.trim().toLowerCase()

    return overview.reports.filter((report) => {
      const matchesMunicipality = municipalityFilter === 'all' || toDisplayText(report.municipality) === municipalityFilter
      const matchesCase = caseFilter === 'all' || toDisplayText(report.violation_type) === caseFilter
      const matchesReference = !query || toDisplayText(report.reference_number).toLowerCase().includes(query)
      const reportDate = report.created_at ? new Date(report.created_at).toISOString().slice(0, 10) : ''
      const matchesDate = !dateFilter || reportDate === dateFilter
      return matchesMunicipality && matchesCase && matchesReference && matchesDate
    })
  }, [caseFilter, dateFilter, municipalityFilter, overview.reports, referenceSearch])

  const selectedReport = useMemo(() => {
    return overview.reports.find((report) => report.id === selectedReportId) || null
  }, [overview.reports, selectedReportId])

  const highestMunicipality = useMemo(() => {
    return overview.municipality_counts.reduce((highest, item) => {
      const count = Number(item.count) || 0
      if (!highest || count > highest.count) {
        return { municipality: item.municipality, count }
      }
      return highest
    }, null)
  }, [overview.municipality_counts])

  const highestAreaReports = useMemo(() => {
    if (!highestMunicipality?.municipality || highestMunicipality.count === 0) return []
    return overview.reports
      .filter((report) => toDisplayText(report.municipality) === highestMunicipality.municipality)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  }, [highestMunicipality, overview.reports])

  useEffect(() => {
    if (selectedReportId && !overview.reports.some((report) => report.id === selectedReportId)) {
      setSelectedReportId(null)
    }
  }, [overview.reports, selectedReportId])

  function openActionEditor(report) {
    setActionReport(report)
    setActionNotes(report.resolution_notes || '')
  }

  function closeActionEditor() {
    setActionReport(null)
    setActionNotes('')
    setSavingAction(false)
  }

  async function handleSaveReportAction() {
    if (!actionReport) return
    const notes = actionNotes.trim()
    if (!notes) {
      setMessage('DENR action description is required before marking the report as acted.')
      return
    }

    setSavingAction(true)
    try {
      const response = await api.patch(`/admin/reports/${actionReport.id}/status`, {
        status: 'acted',
        notes,
      })
      const updatedReport = response.data?.report
      setOverview((prev) => ({
        ...prev,
        reports: prev.reports.map((report) =>
          report.id === actionReport.id
            ? {
                ...report,
                status: updatedReport?.status || 'acted',
                resolution_date: updatedReport?.resolution_date || new Date().toISOString(),
                resolution_notes: updatedReport?.resolution_notes || notes,
                updated_at: updatedReport?.updated_at || new Date().toISOString(),
              }
            : report
        ),
      }))
      setMessage('DENR action saved. Report is marked as acted and the citizen will see a notification.')
      closeActionEditor()
    } catch (error) {
      setMessage(toDisplayText(error?.response?.data?.error, 'Failed to save DENR action.'))
    } finally {
      setSavingAction(false)
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

  function getReportsForExport(period) {
    const now = new Date()
    const start = period === 'month'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : getStartOfWeek(now)
    const query = referenceSearch.trim().toLowerCase()

    return overview.reports.filter((report) => {
      const submittedAt = report.created_at ? new Date(report.created_at) : null
      if (!submittedAt || Number.isNaN(submittedAt.getTime())) return false

      const matchesPeriod = submittedAt >= start && submittedAt <= now
      const matchesMunicipality = municipalityFilter === 'all' || toDisplayText(report.municipality) === municipalityFilter
      const matchesCase = caseFilter === 'all' || toDisplayText(report.violation_type) === caseFilter
      const matchesReference = !query || toDisplayText(report.reference_number).toLowerCase().includes(query)
      return matchesPeriod && matchesMunicipality && matchesCase && matchesReference
    })
  }

  function downloadExcel(period) {
    const rows = getReportsForExport(period)
    const periodLabel = period === 'month' ? 'This Month' : 'This Week'

    if (rows.length === 0) {
      setMessage(`No reports found for ${periodLabel.toLowerCase()} export.`)
      return
    }

    const headers = [
      'Reference Code',
      'Reported Case',
      'Municipality',
      'Submitter',
      'Phone',
      'Submitted Date and Time',
      'Status',
      'DENR Action Description',
      'Acted Date and Time',
      'Location',
      'Latitude',
      'Longitude',
      'Citizen Description',
    ]

    const bodyRows = rows.map((report) => [
      toDisplayText(report.reference_number, ''),
      toDisplayText(report.violation_type, ''),
      toDisplayText(report.municipality, ''),
      toDisplayText(report.submitter_name, ''),
      toDisplayText(report.phone, ''),
      report.created_at ? formatTimestamp(report.created_at) : '',
      String(report.status || 'submitted').replaceAll('_', ' '),
      toDisplayText(report.resolution_notes, ''),
      report.resolution_date ? formatTimestamp(report.resolution_date) : '',
      toDisplayText(report.manual_location, ''),
      report.latitude ?? '',
      report.longitude ?? '',
      toDisplayText(report.description, ''),
    ])

    const tableHead = headers.map((header) => `<th>${escapeExcelCell(header)}</th>`).join('')
    const tableBody = bodyRows
      .map((row) => `<tr>${row.map((cell) => `<td>${escapeExcelCell(cell)}</td>`).join('')}</tr>`)
      .join('')
    const generatedAt = formatTimestamp(new Date().toISOString())
    const title = `EcoWatch Reports - ${periodLabel}`
    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; }
            h1 { color: #123629; }
            table { border-collapse: collapse; width: 100%; }
            th { background: #0f5f46; color: #ffffff; }
            th, td { border: 1px solid #cfd8d3; padding: 8px; mso-number-format: "\\@"; vertical-align: top; }
          </style>
        </head>
        <body>
          <h1>${escapeExcelCell(title)}</h1>
          <p>Generated: ${escapeExcelCell(generatedAt)}</p>
          <p>Total reports: ${rows.length}</p>
          <table>
            <thead><tr>${tableHead}</tr></thead>
            <tbody>${tableBody}</tbody>
          </table>
        </body>
      </html>`

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ecowatch-reports-${period}-${getLocalDateKey(new Date())}.xls`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setExportMenuOpen(false)
    setMessage(`Exported ${rows.length} report${rows.length === 1 ? '' : 's'} for ${periodLabel.toLowerCase()}.`)
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
              Report dots show exact mapped locations, while municipalities with three or more reports cluster until you zoom in.
            </p>
          </div>
          <div className="bg-[#eef3f0]">
            {loading ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-slate-500 sm:h-[420px]">Loading report markers...</div>
            ) : (
              <OverviewMap reports={overview.reports} onSelectReport={setSelectedReportId} />
            )}
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-[#d6dfd9] bg-white p-4 shadow-sm sm:rounded-[1.7rem] sm:p-6">
          <div className="border-b border-[#e5ece8] pb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46]">
              {selectedReport ? 'Case Details' : 'Highest Reported Area'}
            </p>
            <h3 className="mt-2 break-words text-xl font-black text-[#123629] sm:text-2xl">
              {selectedReport
                ? toDisplayText(selectedReport.reference_number, 'No reference number')
                : highestMunicipality?.count
                  ? `${highestMunicipality.municipality} (${highestMunicipality.count})`
                  : 'No reported area yet'}
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
              <DetailField label="DENR Action Status">{String(selectedReport.status || 'submitted').replaceAll('_', ' ')}</DetailField>
              <DetailField label="DENR Action Description">{toDisplayText(selectedReport.resolution_notes, 'No DENR action recorded yet.')}</DetailField>
              <DetailField label="Acted Date and Time">{selectedReport.resolution_date ? formatTimestamp(selectedReport.resolution_date) : 'Not acted yet'}</DetailField>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {highestAreaReports.length === 0 ? (
                <div className="rounded-[1.05rem] border border-dashed border-[#ccd7d1] bg-[#f8fbf9] px-4 py-8 text-sm text-slate-500">
                  No reports have been submitted yet.
                </div>
              ) : (
                <>
                  <div className="rounded-[1.05rem] border border-[#dbe4df] bg-[#f8fbf9] px-4 py-4">
                    <p className="text-sm font-semibold text-slate-700">
                      This area currently has the highest number of reported cases.
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Click View Details on a case below to show the full information here.
                    </p>
                  </div>

                  <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                    {highestAreaReports.map((report) => (
                      <article key={report.id} className="rounded-[1.05rem] border border-[#dbe4df] bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-words text-base font-black text-[#123629]">{toDisplayText(report.reference_number, 'No reference number')}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">{toDisplayText(report.violation_type, 'Untitled report')}</p>
                            <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#0f5f46]">{formatTimestamp(report.created_at)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedReportId(report.id)}
                            className="min-h-10 rounded-full border border-[#003915] bg-[#00441b] px-4 text-sm font-black text-white"
                          >
                            View Details
                          </button>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                          <div className="rounded-xl border border-[#e5ece8] bg-[#f8fbf9] px-3 py-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Submitter</p>
                            <p className="mt-1 font-semibold text-slate-700">{toDisplayText(report.submitter_name, 'Unknown submitter')}</p>
                          </div>
                          <div className="rounded-xl border border-[#e5ece8] bg-[#f8fbf9] px-3 py-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Status</p>
                            <p className="mt-1 font-semibold capitalize text-slate-700">{String(report.status || 'submitted').replaceAll('_', ' ')}</p>
                          </div>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{toDisplayText(report.description, 'Not available')}</p>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[1.25rem] border border-[#d6dfd9] bg-white shadow-sm sm:rounded-[1.7rem]">
        <div className="border-b border-[#e5ece8] px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46]">Reports Table</p>
          <h3 className="mt-2 text-xl font-black text-[#123629] sm:text-2xl">Municipality Report Entries</h3>

          <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_13rem_16rem_12rem_auto]">
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
                {REPORTED_CASES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Date</span>
              <input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="min-h-12 rounded-xl border border-[#cfd8d3] bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-[#0f5f46] focus:ring-2 focus:ring-[#0f5f46]/15"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setReferenceSearch('')
                setMunicipalityFilter('all')
                setCaseFilter('all')
                setDateFilter('')
              }}
              className="min-h-12 self-end rounded-xl border border-[#cfd8d3] bg-white px-5 text-sm font-black text-[#1a5e20] shadow-[0_2px_0_#cfd8d3]"
            >
              Clear
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#e1e9e5] bg-gradient-to-r from-[#f8fbf9] to-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#0f5f46]">Export to Excel</p>
              <p className="mt-1 text-sm text-slate-600">Exports use the current reference, municipality, and case filters.</p>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportMenuOpen((open) => !open)}
                aria-expanded={exportMenuOpen}
                className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-[#003915] bg-[#00441b] px-5 text-sm font-black text-white shadow-[0_3px_0_#003915] transition hover:-translate-y-0.5 hover:bg-[#0a5a28] hover:shadow-[0_5px_0_#003915] sm:w-auto"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#00441b]">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
                    <path d="M14 2v5h5" />
                    <path d="M12 11v6" />
                    <path d="m9 14 3 3 3-3" />
                  </svg>
                </span>
                Export Reports
                <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-4 w-4 transition ${exportMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {exportMenuOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-full min-w-64 overflow-hidden rounded-2xl border border-[#cfd8d3] bg-white p-2 shadow-xl sm:w-72">
                  <button
                    type="button"
                    onClick={() => downloadExcel('week')}
                    className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-4 text-left text-sm font-black text-[#123629] transition hover:bg-[#f0f6f2]"
                  >
                    <span>
                      <span className="block">This Week</span>
                      <span className="block text-xs font-semibold text-slate-500">Monday to today</span>
                    </span>
                    <span className="rounded-full bg-[#eaf4ee] px-2 py-1 text-xs text-[#0f5f46]">XLS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadExcel('month')}
                    className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-4 text-left text-sm font-black text-[#123629] transition hover:bg-[#f0f6f2]"
                  >
                    <span>
                      <span className="block">This Month</span>
                      <span className="block text-xs font-semibold text-slate-500">Month start to today</span>
                    </span>
                    <span className="rounded-full bg-[#eaf4ee] px-2 py-1 text-xs text-[#0f5f46]">XLS</span>
                  </button>
                </div>
              ) : null}
            </div>
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
                <div className="min-w-0">
                  <p className="break-words text-base font-black text-[#123629]">{toDisplayText(report.reference_number, 'No reference number')}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{toDisplayText(report.municipality, 'Unknown municipality')}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => openActionEditor(report)} className="min-h-11 rounded-full border border-[#cfd8d3] bg-white px-3 text-sm font-black text-[#1a5e20]">
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDeleteReport(report.id)} className="min-h-11 rounded-full border border-red-200 bg-red-50 px-3 text-sm font-black text-red-700">
                    Delete
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  <span>{formatTimestamp(report.created_at)}</span>
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
                        <button type="button" onClick={() => openActionEditor(report)} className="rounded-full border border-[#cfd8d3] bg-white px-4 py-2 text-sm font-black text-[#1a5e20]">
                          Edit Action
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

      {actionReport ? (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#001d12]/70 px-3 py-6">
          <div className="w-full max-w-2xl overflow-hidden rounded-[1.4rem] rounded-tr-none border border-[#d7e0da] bg-white shadow-2xl">
            <div className="border-b border-[#e5ece8] bg-[#f7faf8] px-5 py-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0f5f46]">DENR Action</p>
              <h3 className="mt-1 text-2xl font-black text-[#123629]">Edit Report Action</h3>
              <p className="mt-2 text-sm font-semibold text-slate-600">{toDisplayText(actionReport.reference_number, 'No reference number')}</p>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="rounded-2xl border border-[#dbe4df] bg-[#f8fbf9] px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0f5f46]">Current status</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{String(actionReport.status || 'submitted').replaceAll('_', ' ')}</p>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-black text-[#123629]">DENR description / action taken</span>
                <textarea
                  value={actionNotes}
                  onChange={(event) => setActionNotes(event.target.value)}
                  rows={5}
                  placeholder="Example: DENR personnel validated the report, coordinated with the area office, and acted on the concern."
                  className="min-h-32 rounded-2xl border border-[#cfd8d3] bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none focus:border-[#0f5f46] focus:ring-2 focus:ring-[#0f5f46]/15"
                />
              </label>

              <div className="rounded-2xl border border-[#cfe0d7] bg-[#f4faf7] px-4 py-3 text-sm font-semibold text-[#123629]">
                When saved, this report will be marked as acted. Date and time are recorded automatically by the system.
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#e5ece8] px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeActionEditor}
                className="min-h-12 rounded-full border border-[#cfd8d3] bg-white px-5 text-sm font-black text-[#1a5e20] shadow-[0_2px_0_#cfd8d3]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAction}
                onClick={handleSaveReportAction}
                className="min-h-12 rounded-full border border-[#003915] bg-[#00441b] px-5 text-sm font-black text-white shadow-[0_3px_0_#003915] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingAction ? 'Saving...' : 'Mark as Acted'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
