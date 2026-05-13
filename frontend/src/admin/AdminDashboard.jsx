import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import api from '../lib/api'
import { toDisplayText } from '../lib/text'
import AdminReportMapPanel from './AdminReportMapPanel'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const REFRESH_INTERVAL_MS = 15000

function getReportCountColor(count) {
  if (count >= 5) return '#dc2626'
  if (count >= 3) return '#d6b44c'
  if (count >= 1) return '#1f6a53'
  return '#d8e0db'
}

function formatTimestamp(value) {
  if (!value) return 'No timestamp'

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState({
    generated_at: null,
    top_municipality: null,
    municipality_counts: [],
    reports: [],
  })
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
          top_municipality: response.data.top_municipality,
          municipality_counts: Array.isArray(response.data.municipality_counts) ? response.data.municipality_counts : [],
          reports: Array.isArray(response.data.reports) ? response.data.reports : [],
        })
        setMessage(null)
      } catch (error) {
        if (isMounted) setMessage(toDisplayText(error?.response?.data?.error, 'Unable to load administrative report overview.'))
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

  const reportsWithCoordinates = overview.reports.filter((report) => report.latitude !== null && report.longitude !== null).length

  const chartData = useMemo(() => ({
    labels: overview.municipality_counts.map((entry) => entry.municipality),
    datasets: [
      {
        label: 'Reports',
        data: overview.municipality_counts.map((entry) => entry.count),
        backgroundColor: overview.municipality_counts.map((entry) => getReportCountColor(Number(entry.count) || 0)),
        borderRadius: 10,
        maxBarThickness: 48,
      },
    ],
  }), [overview.municipality_counts])

  const chartOptions = useMemo(() => ({
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.y} report${context.parsed.y === 1 ? '' : 's'}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#334155' },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: '#334155' },
        grid: { color: 'rgba(148, 163, 184, 0.18)' },
      },
    },
  }), [])

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-[1.25rem] border border-[#d6dfd9] bg-white p-4 shadow-sm sm:rounded-[1.6rem] sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0f5f46] sm:text-[11px] sm:tracking-[0.22em]">Live Municipal Overview</p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-[#123629] sm:text-3xl">Administrative Report Monitoring</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Track report volume across municipalities, monitor case levels, and open the reports workspace for detailed review.
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
          <p className="mt-2 text-sm text-slate-600">Reports with usable longitude and latitude coordinates.</p>
        </div>

        <div className="rounded-[1.15rem] border border-[#d6dfd9] bg-white p-4 shadow-sm sm:rounded-[1.4rem] sm:p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46] sm:text-xs sm:tracking-[0.18em]">Highest Reported Area</p>
          <p className="mt-2 text-2xl font-black text-slate-900 sm:mt-3 sm:text-3xl">{overview.top_municipality || 'No data yet'}</p>
          <p className="mt-2 text-sm text-slate-600">The municipality with the highest current report volume.</p>
        </div>
      </section>

      <AdminReportMapPanel
        reports={overview.reports}
        municipalityCounts={overview.municipality_counts}
        loading={loading}
      />

      <section className="rounded-[1.25rem] border border-[#d6dfd9] bg-white p-4 shadow-sm sm:rounded-[1.7rem] sm:p-6">
        <div className="flex flex-col gap-3 border-b border-[#e5ece8] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46] sm:text-xs sm:tracking-[0.18em]">Reports Per Municipality</p>
            <h3 className="mt-2 text-xl font-black text-[#123629] sm:text-2xl">Municipal Distribution</h3>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d6dfd9] bg-white px-3 py-1"><span className="h-2.5 w-2.5 rounded-full bg-[#1f6a53]" />1-2</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d6dfd9] bg-white px-3 py-1"><span className="h-2.5 w-2.5 rounded-full bg-[#d6b44c]" />3-4</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d6dfd9] bg-white px-3 py-1"><span className="h-2.5 w-2.5 rounded-full bg-[#dc2626]" />5+</span>
          </div>
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

      <section className="rounded-[1.25rem] border border-[#d6dfd9] bg-[#f7faf8] p-4 shadow-sm sm:rounded-[1.5rem] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0f5f46] sm:text-xs sm:tracking-[0.18em]">Reports Workspace</p>
            <h3 className="mt-2 text-xl font-black text-[#123629] sm:text-2xl">Review filtered citizen reports</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Open the reports page to filter by municipality, reported case, or citizen reference code.
            </p>
          </div>
          <Link
            to="/admin/reports"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#003915] bg-[#00441b] px-5 text-sm font-black text-white shadow-[0_3px_0_#003112]"
          >
            Open Reports
          </Link>
        </div>
      </section>
    </div>
  )
}
