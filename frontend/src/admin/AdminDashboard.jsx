import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import api from '../lib/api'
import { toDisplayText } from '../lib/text'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const REFRESH_INTERVAL_MS = 15000
const DEFAULT_CENTER = [14.987, 120.105]
const DEFAULT_ZOOM = 10
const FOCUSED_ZOOM = 15

function formatTimestamp(value) {
  if (!value) return 'No timestamp'

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getEvidenceImages(report) {
  return (report.evidence_media || []).filter((media) => media.is_image && media.url)
}

function normalizeMediaUrl(url) {
  if (!url) return ''
  if (/^(https?:|data:|blob:)/i.test(url)) return url

  const baseURL = api.defaults.baseURL || ''
  return `${baseURL}${url.startsWith('/') ? '' : '/'}${url}`
}

function EvidencePreview({ report, compact = false }) {
  const images = getEvidenceImages(report)
  const firstImage = images[0]

  if (!firstImage) {
    return <span className="text-sm text-slate-400">No photo</span>
  }

  const imageUrl = normalizeMediaUrl(firstImage.url)

  return (
    <a
      href={imageUrl}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
      className={`group inline-flex items-center gap-3 ${compact ? 'max-w-full' : ''}`}
    >
      <img
        src={imageUrl}
      alt={`Evidence for ${toDisplayText(report.reference_number, 'report')}`}
        className="h-14 w-16 rounded-lg border border-[#dbe4df] object-cover shadow-sm transition group-hover:opacity-90"
      />
      <span className="text-sm font-semibold text-[#0f5f46] group-hover:underline">
        View photo{images.length > 1 ? ` (${images.length})` : ''}
      </span>
    </a>
  )
}

function MapFocusController({ report, markerRefs }) {
  const map = useMap()

  useEffect(() => {
    if (report?.latitude === null || report?.latitude === undefined || report?.longitude === null || report?.longitude === undefined) {
      return
    }

    map.flyTo([report.latitude, report.longitude], FOCUSED_ZOOM, { duration: 1.1 })

    const marker = markerRefs.current[report.id]
    if (marker) {
      marker.openPopup()
    }
  }, [map, markerRefs, report])

  return null
}

function OverviewMap({ reports, selectedReport, markerRefs }) {
  const reportsWithCoordinates = reports.filter((report) => report.latitude !== null && report.longitude !== null)

  return (
    <MapContainer
      center={
        selectedReport?.latitude !== null &&
        selectedReport?.latitude !== undefined &&
        selectedReport?.longitude !== null &&
        selectedReport?.longitude !== undefined
          ? [selectedReport.latitude, selectedReport.longitude]
          : DEFAULT_CENTER
      }
      zoom={
        selectedReport?.latitude !== null &&
        selectedReport?.latitude !== undefined &&
        selectedReport?.longitude !== null &&
        selectedReport?.longitude !== undefined
          ? FOCUSED_ZOOM
          : DEFAULT_ZOOM
      }
      scrollWheelZoom
      className="h-[320px] w-full sm:h-[420px]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapFocusController report={selectedReport} markerRefs={markerRefs} />

      {reportsWithCoordinates.map((report) => (
        <Marker
          key={report.id}
          position={[report.latitude, report.longitude]}
          ref={(marker) => {
            if (marker) {
              markerRefs.current[report.id] = marker
            }
          }}
        >
          <Popup>
            <div className="min-w-[180px] text-sm text-slate-700">
              <p className="font-bold text-slate-900">{toDisplayText(report.municipality, 'Unknown municipality')}</p>
              <p className="mt-1">{toDisplayText(report.violation_type, 'Untitled report')}</p>
              <p className="mt-1 text-xs text-slate-500">{formatTimestamp(report.created_at)}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState({
    generated_at: null,
    top_municipality: null,
    municipality_counts: [],
    reports: [],
  })
  const [selectedReportId, setSelectedReportId] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const markerRefs = useRef({})

  async function handleDeleteReport(reportId, event) {
    event.stopPropagation()
    if (!confirm('Are you sure you want to delete this report?')) {
      return
    }
    try {
      await api.delete(`/admin/reports/${reportId}`)
      setOverview((prev) => {
        const reports = prev.reports.filter((report) => report.id !== reportId)
        const municipalityCounts = prev.municipality_counts.map((entry) => ({
          ...entry,
          count: reports.filter((report) => report.municipality === entry.municipality).length,
        }))
        const highestCount = Math.max(0, ...municipalityCounts.map((entry) => entry.count))
        const topMunicipality = municipalityCounts.find((entry) => entry.count === highestCount && highestCount > 0)?.municipality || null

        return {
          ...prev,
          reports,
          municipality_counts: municipalityCounts,
          top_municipality: topMunicipality,
        }
      })
      if (selectedReportId === reportId) {
        setSelectedReportId(null)
      }
      setMessage('Report deleted successfully')
    } catch (error) {
      setMessage(toDisplayText(error?.response?.data?.error, 'Failed to delete report'))
    }
  }

  async function handleMarkReportDone(reportId, event) {
    event.stopPropagation()

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
      setMessage(toDisplayText(error?.response?.data?.error, 'Failed to mark report done'))
    }
  }

  useEffect(() => {
    function handleClickOutside() {
      setOpenMenuId(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function fetchOverview({ silent = false } = {}) {
      if (!silent) {
        setLoading(true)
      }

      try {
        const response = await api.get('/admin/reports/overview')
        if (!isMounted) {
          return
        }

        const nextOverview = {
          generated_at: response.data.generated_at,
          top_municipality: response.data.top_municipality,
          municipality_counts: Array.isArray(response.data.municipality_counts) ? response.data.municipality_counts : [],
          reports: Array.isArray(response.data.reports) ? response.data.reports : [],
        }

        setOverview(nextOverview)
        setMessage(null)

        setSelectedReportId((currentId) => {
          const selectedStillExists = nextOverview.reports.some((report) => report.id === currentId)
          if (selectedStillExists) {
            return currentId
          }

          return nextOverview.reports.find((report) => report.latitude !== null && report.longitude !== null)?.id || null
        })
      } catch (error) {
        if (!isMounted) {
          return
        }

        setMessage(toDisplayText(error?.response?.data?.error, 'Unable to load administrative report overview.'))
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchOverview()
    const intervalId = window.setInterval(() => fetchOverview({ silent: true }), REFRESH_INTERVAL_MS)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  const selectedReport = useMemo(
    () => overview.reports.find((report) => report.id === selectedReportId) || null,
    [overview.reports, selectedReportId]
  )

  const chartData = useMemo(() => {
    const highestCount = Math.max(...overview.municipality_counts.map((entry) => entry.count), 0)

    return {
      labels: overview.municipality_counts.map((entry) => entry.municipality),
      datasets: [
        {
          label: 'Reports',
          data: overview.municipality_counts.map((entry) => entry.count),
          backgroundColor: overview.municipality_counts.map((entry) =>
            entry.count === highestCount && highestCount > 0 ? '#d6b44c' : '#1f6a53'
          ),
          borderRadius: 10,
          maxBarThickness: 48,
        },
      ],
    }
  }, [overview.municipality_counts])

  const chartOptions = useMemo(
    () => ({
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.parsed.y} report${context.parsed.y === 1 ? '' : 's'}`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#334155',
          },
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            color: '#334155',
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.18)',
          },
        },
      },
    }),
    []
  )

  const reportsWithCoordinates = overview.reports.filter((report) => report.latitude !== null && report.longitude !== null).length

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-[1.25rem] border border-[#d6dfd9] bg-white p-4 shadow-sm sm:rounded-[1.6rem] sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0f5f46] sm:text-[11px] sm:tracking-[0.22em]">Live Municipal Overview</p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-[#123629] sm:text-3xl">Administrative Report Monitoring</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Track municipal report volume, inspect live report coordinates, and jump directly to the reported area from the table below.
            </p>
          </div>

          <div className="rounded-2xl border border-[#d8e0db] bg-[#f7faf8] px-4 py-3 text-sm text-slate-600 lg:min-w-56">
            <p className="font-semibold text-slate-900">Auto-refresh</p>
            <p>Every 15 seconds</p>
            <p className="mt-1 text-xs text-slate-500">
              {overview.generated_at ? `Last sync: ${formatTimestamp(overview.generated_at)}` : 'Waiting for first sync'}
            </p>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {toDisplayText(message)}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        <div className="rounded-[1.15rem] border border-[#d6dfd9] bg-white p-4 shadow-sm sm:rounded-[1.4rem] sm:p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46] sm:text-xs sm:tracking-[0.18em]">Total Reports</p>
          <p className="mt-2 text-3xl font-black text-slate-900 sm:mt-3 sm:text-4xl">{overview.reports.length}</p>
          <p className="mt-2 text-sm text-slate-600">All submitted reports currently available to the administrator.</p>
        </div>

        <div className="rounded-[1.15rem] border border-[#d6dfd9] bg-white p-4 shadow-sm sm:rounded-[1.4rem] sm:p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46] sm:text-xs sm:tracking-[0.18em]">Mapped Cases</p>
          <p className="mt-2 text-3xl font-black text-slate-900 sm:mt-3 sm:text-4xl">{reportsWithCoordinates}</p>
          <p className="mt-2 text-sm text-slate-600">Reports with usable longitude and latitude coordinates for map display.</p>
        </div>

        <div className="rounded-[1.15rem] border border-[#d6dfd9] bg-white p-4 shadow-sm sm:rounded-[1.4rem] sm:p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46] sm:text-xs sm:tracking-[0.18em]">Highest Municipality</p>
          <p className="mt-2 text-2xl font-black text-slate-900 sm:mt-3 sm:text-3xl">{overview.top_municipality || 'No data yet'}</p>
          <p className="mt-2 text-sm text-slate-600">The bar chart highlights the municipality with the highest current report volume.</p>
        </div>
      </section>

      <section className="rounded-[1.25rem] border border-[#d6dfd9] bg-white p-4 shadow-sm sm:rounded-[1.7rem] sm:p-6">
        <div className="flex flex-col gap-3 border-b border-[#e5ece8] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46] sm:text-xs sm:tracking-[0.18em]">Reports Per Municipality</p>
            <h3 className="mt-2 text-xl font-black text-[#123629] sm:text-2xl">Municipal Distribution</h3>
          </div>
          <p className="text-sm text-slate-500"></p>
        </div>

        <div className="mt-4 h-[260px] sm:mt-6 sm:h-[340px]">
          {loading ? (
              <div className="flex h-full items-center justify-center rounded-[1.1rem] border border-dashed border-[#cbd7d0] bg-[#f8fbf9] text-sm text-slate-500 sm:rounded-[1.4rem]">
              Loading chart data...
            </div>
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:gap-6 xl:grid-cols-[1.15fr_0.95fr]">
        <div className="overflow-hidden rounded-[1.25rem] border border-[#d6dfd9] bg-white shadow-sm sm:rounded-[1.7rem]">
          <div className="border-b border-[#e5ece8] px-4 py-4 sm:px-6 sm:py-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46] sm:text-xs sm:tracking-[0.18em]">Interactive Map</p>
            <h3 className="mt-2 text-xl font-black text-[#123629] sm:text-2xl">Reported Areas</h3>
            <p className="mt-2 text-sm text-slate-600">
              Click a report row or use the action button to zoom directly to the reported location.
            </p>
          </div>

          <div className="bg-[#eef3f0]">
            {loading ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-slate-500 sm:h-[420px]">Loading map markers...</div>
            ) : (
              <OverviewMap reports={overview.reports} selectedReport={selectedReport} markerRefs={markerRefs} />
            )}
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-[#d6dfd9] bg-white p-4 shadow-sm sm:rounded-[1.7rem] sm:p-6">
          <div className="flex flex-col gap-3 border-b border-[#e5ece8] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46] sm:text-xs sm:tracking-[0.18em]">Focused Report</p>
              <h3 className="mt-2 break-words text-xl font-black text-[#123629] sm:text-2xl">
                {selectedReport ? toDisplayText(selectedReport.reference_number, 'No reference number') : 'No report selected'}
              </h3>
            </div>
            {selectedReport && (
              <div className="self-start rounded-2xl border border-[#cfe0d7] bg-[#f4faf7] px-3 py-2 text-left sm:rounded-full sm:px-4 sm:text-right">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#0f5f46]">Timestamp</p>
                <p className="mt-1 text-sm font-semibold text-slate-800 sm:whitespace-nowrap">{formatTimestamp(selectedReport.created_at)}</p>
              </div>
            )}
          </div>

          {selectedReport ? (
            <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
              <div className="rounded-[1.05rem] border border-[#cfe0d7] bg-gradient-to-br from-[#f7fbf8] to-[#edf6f1] px-4 py-4 sm:rounded-[1.2rem]">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46] sm:text-xs sm:tracking-[0.18em]">Submitted By</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="break-words text-base font-black text-[#123629] sm:text-lg">{toDisplayText(selectedReport.submitter_name, 'Unknown submitter')}</p>
                <p className="w-fit rounded-full border border-[#d4e2da] bg-white px-3 py-1 text-sm font-semibold text-slate-700">
                    {toDisplayText(selectedReport.phone, 'No phone number')}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.05rem] border border-[#dbe4df] bg-[#f8fbf9] px-4 py-4 sm:rounded-[1.2rem]">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46] sm:text-xs sm:tracking-[0.18em]">Municipality</p>
                <p className="mt-2 text-lg font-bold text-slate-900">{toDisplayText(selectedReport.municipality, 'Unknown municipality')}</p>
              </div>

              <div className="rounded-[1.05rem] border border-[#dbe4df] bg-[#f8fbf9] px-4 py-4 sm:rounded-[1.2rem]">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46] sm:text-xs sm:tracking-[0.18em]">Violation Type</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{toDisplayText(selectedReport.violation_type, 'Untitled report')}</p>
              </div>

              <div className="rounded-[1.05rem] border border-[#dbe4df] bg-[#f8fbf9] px-4 py-4 sm:rounded-[1.2rem]">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46] sm:text-xs sm:tracking-[0.18em]">Evidence Photo</p>
                <div className="mt-3">
                  <EvidencePreview report={selectedReport} compact />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="rounded-[1.05rem] border border-[#dbe4df] bg-[#f8fbf9] px-4 py-4 sm:rounded-[1.2rem]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46] sm:text-xs sm:tracking-[0.18em]">Latitude</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {selectedReport.latitude !== null ? selectedReport.latitude : 'Not available'}
                  </p>
                </div>

                <div className="rounded-[1.05rem] border border-[#dbe4df] bg-[#f8fbf9] px-4 py-4 sm:rounded-[1.2rem]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46] sm:text-xs sm:tracking-[0.18em]">Longitude</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {selectedReport.longitude !== null ? selectedReport.longitude : 'Not available'}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.05rem] border border-[#dbe4df] bg-[#f8fbf9] px-4 py-4 sm:rounded-[1.2rem]">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46] sm:text-xs sm:tracking-[0.18em]">Location Source</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{toDisplayText(selectedReport.manual_location, 'Coordinate-only report')}</p>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[1.05rem] border border-dashed border-[#ccd7d1] bg-[#f8fbf9] px-4 py-8 text-sm text-slate-500 sm:rounded-[1.2rem]">
              Select a report with coordinates to focus the map and open its location details.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[1.25rem] border border-[#d6dfd9] bg-white shadow-sm sm:rounded-[1.7rem]">
        <div className="border-b border-[#e5ece8] px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46] sm:text-xs sm:tracking-[0.18em]">Reports Table</p>
          <h3 className="mt-2 text-xl font-black text-[#123629] sm:text-2xl">Municipality Report Entries</h3>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {overview.reports.length === 0 ? (
            <div className="rounded-[1.05rem] border border-dashed border-[#ccd7d1] bg-[#f8fbf9] px-4 py-8 text-center text-sm text-slate-500">
              No reports available yet.
            </div>
          ) : (
            overview.reports.map((report) => {
              const isSelected = report.id === selectedReportId
              const hasCoordinates = report.latitude !== null && report.longitude !== null

              return (
                <article
                  key={report.id}
                  onClick={() => {
                    if (hasCoordinates) {
                      setSelectedReportId(report.id)
                    }
                    setOpenMenuId(null)
                  }}
                  className={`rounded-[1.05rem] border p-4 shadow-sm ${isSelected ? 'border-[#93b8a7] bg-[#f3f7f5]' : 'border-[#dbe4df] bg-white'} ${hasCoordinates ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-base font-black text-[#123629]">{toDisplayText(report.reference_number, 'No reference number')}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{toDisplayText(report.municipality, 'Unknown municipality')}</p>
                    </div>
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setOpenMenuId(openMenuId === report.id ? null : report.id)
                        }}
                        className="rounded-full border border-[#dbe4df] px-3 py-1 text-lg leading-none text-slate-600 transition hover:bg-slate-100"
                        aria-label="Open report actions"
                      >
                        ...
                      </button>
                      {openMenuId === report.id && (
                        <div className="absolute right-0 z-10 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                          <button
                            type="button"
                            disabled={report.status === 'resolved'}
                            onClick={(event) => {
                              handleMarkReportDone(report.id, event)
                              setOpenMenuId(null)
                            }}
                            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            Mark Done
                          </button>
                          <button
                            type="button"
                            disabled={!hasCoordinates}
                            onClick={(event) => {
                              event.stopPropagation()
                              setSelectedReportId(report.id)
                              setOpenMenuId(null)
                            }}
                            className="flex w-full items-center gap-2 border-t border-slate-200 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            See Area
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              handleDeleteReport(report.id, event)
                              setOpenMenuId(null)
                            }}
                            className="flex w-full items-center gap-2 border-t border-slate-200 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0f5f46]">Longitude</p>
                      <p className="mt-1 break-words text-slate-700">{report.longitude ?? 'Not available'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0f5f46]">Latitude</p>
                      <p className="mt-1 break-words text-slate-700">{report.latitude ?? 'Not available'}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0f5f46]">Evidence Photo</p>
                      <div className="mt-2">
                        <EvidencePreview report={report} compact />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0f5f46]">Description</p>
                      <p className="mt-1 leading-6">{toDisplayText(report.description, 'Not available')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0f5f46]">Submitter</p>
                      <p className="mt-1 font-semibold text-slate-900">{toDisplayText(report.submitter_name, 'Unknown submitter')}</p>
                      <p className="text-slate-500">{toDisplayText(report.phone, 'No phone number')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0f5f46]">Timestamp</p>
                      <p className="mt-1">{formatTimestamp(report.created_at)}</p>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-[#e5ece8]">
            <thead className="bg-[#f7faf8]">
              <tr className="text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-600">
                <th className="px-6 py-4">Report ID</th>
                <th className="px-6 py-4">Municipality</th>
                <th className="px-6 py-4">Longitude</th>
                <th className="px-6 py-4">Latitude</th>
                <th className="px-6 py-4">Evidence</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Submitter</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#eef2ef] bg-white">
              {overview.reports.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-10 text-center text-sm text-slate-500">
                    No reports available yet.
                  </td>
                </tr>
              ) : (
                overview.reports.map((report) => {
                  const isSelected = report.id === selectedReportId
                  const hasCoordinates = report.latitude !== null && report.longitude !== null

                  return (
                    <tr
                      key={report.id}
                      onClick={() => {
                        if (hasCoordinates) {
                          setSelectedReportId(report.id)
                        }
                        setOpenMenuId(null)
                      }}
                      className={`${isSelected ? 'bg-[#f3f7f5]' : 'hover:bg-[#fafcfb]'} ${hasCoordinates ? 'cursor-pointer' : ''}`}
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{toDisplayText(report.reference_number, 'No reference number')}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{toDisplayText(report.municipality, 'Unknown municipality')}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{report.longitude ?? 'Not available'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{report.latitude ?? 'Not available'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <EvidencePreview report={report} />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{toDisplayText(report.description, 'Not available')}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <div className="flex min-w-48 flex-col gap-1">
                          <span className="font-semibold text-slate-900">{toDisplayText(report.submitter_name, 'Unknown submitter')}</span>
                          <span className="text-slate-500">{toDisplayText(report.phone, 'No phone number')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{formatTimestamp(report.created_at)}</td>
                      <td className="px-6 py-4">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setOpenMenuId(openMenuId === report.id ? null : report.id)
                            }}
                            className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100"
                            aria-label="Open report actions"
                          >
                            ...
                          </button>
                          {openMenuId === report.id && (
                            <div className="absolute right-0 z-10 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                              <button
                                type="button"
                                disabled={report.status === 'resolved'}
                                onClick={(event) => {
                                  handleMarkReportDone(report.id, event)
                                  setOpenMenuId(null)
                                }}
                                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                              >
                                Mark Done
                              </button>
                              <button
                                type="button"
                                disabled={!hasCoordinates}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setSelectedReportId(report.id)
                                  setOpenMenuId(null)
                                }}
                                className="flex w-full items-center gap-2 border-t border-slate-200 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                              >
                              See Area
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  handleDeleteReport(report.id, event)
                                  setOpenMenuId(null)
                                }}
                                className="flex w-full items-center gap-2 border-t border-slate-200 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                              >
                               Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
