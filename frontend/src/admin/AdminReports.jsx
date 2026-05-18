import React, { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import { toDisplayText } from '../lib/text'

const REFRESH_INTERVAL_MS = 15000

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
  'Mining Act (RA 7942)',
  'Wildlife (RA 9147)',
]

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

function escapeExcelCell(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default function AdminReports() {
  const [overview, setOverview] = useState({ generated_at: null, municipality_counts: [], reports: [] })
  const [municipalityFilter, setMunicipalityFilter] = useState('all')
  const [caseFilter, setCaseFilter] = useState('all')
  const [previousDateFilter, setPreviousDateFilter] = useState('')
  const [presentDateFilter, setPresentDateFilter] = useState(getLocalDateKey(new Date()))
  const [referenceSearch, setReferenceSearch] = useState('')
  const [message, setMessage] = useState(null)
  const [actionReport, setActionReport] = useState(null)
  const [actionNotes, setActionNotes] = useState('')
  const [savingAction, setSavingAction] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function fetchOverview() {
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
      }
    }

    fetchOverview()
    const intervalId = window.setInterval(fetchOverview, REFRESH_INTERVAL_MS)

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
      const reportDate = getLocalDateKey(report.created_at)
      const matchesDate =
        (!previousDateFilter || reportDate >= previousDateFilter) &&
        (!presentDateFilter || reportDate <= presentDateFilter)
      return matchesMunicipality && matchesCase && matchesReference && matchesDate
    })
  }, [caseFilter, municipalityFilter, overview.reports, presentDateFilter, previousDateFilter, referenceSearch])

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
      setMessage('Report deleted successfully.')
    } catch (error) {
      setMessage(toDisplayText(error?.response?.data?.error, 'Failed to delete report.'))
    }
  }

  function getReportsForExport() {
    const query = referenceSearch.trim().toLowerCase()

    return overview.reports.filter((report) => {
      const matchesMunicipality = municipalityFilter === 'all' || toDisplayText(report.municipality) === municipalityFilter
      const matchesCase = caseFilter === 'all' || toDisplayText(report.violation_type) === caseFilter
      const matchesReference = !query || toDisplayText(report.reference_number).toLowerCase().includes(query)
      const reportDate = getLocalDateKey(report.created_at)
      const matchesDate =
        (!previousDateFilter || reportDate >= previousDateFilter) &&
        (!presentDateFilter || reportDate <= presentDateFilter)
      return matchesMunicipality && matchesCase && matchesReference && matchesDate
    })
  }

  function downloadExcel() {
    const rows = getReportsForExport()
    const scopeLabel = municipalityFilter === 'all' ? 'all municipalities' : municipalityFilter

    if (rows.length === 0) {
      setMessage(`No reports found for ${scopeLabel} export.`)
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
    const title = `EcoWatch Reports - ${municipalityFilter === 'all' ? 'All Municipalities' : municipalityFilter}`
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
    const municipalitySlug = municipalityFilter === 'all' ? 'all-municipalities' : municipalityFilter.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const dateSlug = previousDateFilter || presentDateFilter ? `${previousDateFilter || 'start'}-to-${presentDateFilter || 'present'}` : 'all-dates'
    link.download = `ecowatch-reports-${municipalitySlug}-${dateSlug}-${getLocalDateKey(new Date())}.xls`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setMessage(`Exported ${rows.length} report${rows.length === 1 ? '' : 's'} for ${scopeLabel}.`)
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

      <section className="rounded-[1.25rem] border border-[#d6dfd9] bg-white shadow-sm sm:rounded-[1.7rem]">
        <div className="border-b border-[#e5ece8] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46]">Reports Table</p>
              <h3 className="mt-2 text-xl font-black text-[#123629] sm:text-2xl">Municipality Report Entries</h3>
            </div>
            <button
              type="button"
              onClick={downloadExcel}
              className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#003915] bg-[#00441b] px-5 text-sm font-black text-white shadow-[0_3px_0_#003915] transition hover:-translate-y-0.5 hover:bg-[#0a5a28] hover:shadow-[0_5px_0_#003915] sm:w-auto"
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
            </button>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_13rem_16rem_12rem_12rem_auto]">
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
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Previous</span>
              <input
                type="date"
                max={presentDateFilter || getLocalDateKey(new Date())}
                value={previousDateFilter}
                onChange={(event) => setPreviousDateFilter(event.target.value)}
                className="min-h-12 rounded-xl border border-[#cfd8d3] bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-[#0f5f46] focus:ring-2 focus:ring-[#0f5f46]/15"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Present</span>
              <input
                type="date"
                min={previousDateFilter || undefined}
                max={getLocalDateKey(new Date())}
                value={presentDateFilter}
                onChange={(event) => setPresentDateFilter(event.target.value)}
                className="min-h-12 rounded-xl border border-[#cfd8d3] bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-[#0f5f46] focus:ring-2 focus:ring-[#0f5f46]/15"
              />
            </label>
            <div className="grid gap-2 self-end">
              <button
                type="button"
                onClick={() => {
                  setReferenceSearch('')
                  setMunicipalityFilter('all')
                  setCaseFilter('all')
                  setPreviousDateFilter('')
                  setPresentDateFilter(getLocalDateKey(new Date()))
                }}
                className="min-h-12 rounded-xl border border-[#cfd8d3] bg-white px-5 text-sm font-black text-[#1a5e20] shadow-[0_2px_0_#cfd8d3]"
              >
                Clear
              </button>
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
                  <td colSpan="6" className="px-6 py-6 text-center text-sm text-slate-500">No reports match the current filters.</td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-[#fafcfb]">
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
