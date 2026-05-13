import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { toDisplayText } from '../lib/text'

function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    report: (
      <>
        <path d="M9 3h6l4 4v14H5V3h4Z" />
        <path d="M14 3v5h5" />
        <path d="M8.5 13h7" />
        <path d="M8.5 17h5" />
      </>
    ),
    profile: (
      <>
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function statusClasses(status) {
  if (status === 'resolved') return 'border-[#b9d7b3] bg-[#eef6ea] text-[#1a5e20]'
  if (status === 'pending') return 'border-[#e5c76b] bg-[#fff7d6] text-[#8a6200]'
  if (status === 'submitted') return 'border-[#111827] bg-[#111827] text-white'
  if (status === 'in_review') return 'border-[#c6d8bd] bg-[#f4f8f1] text-[#33691e]'
  return 'border-[#d4d9dd] bg-[#f8f9fa] text-[#495057]'
}

function StatTile({ label, value, tone = 'plain' }) {
  const tones = {
    plain: 'border-[#cfd8d3] bg-white text-[#00441b]',
    pending: 'border-[#c6d8bd] bg-[#f4f8f1] text-[#1a5e20]',
    resolved: 'border-[#b9d7b3] bg-[#eef6ea] text-[#1a5e20]',
  }

  return (
    <div className={`rounded-xl border p-4 shadow-[0_8px_18px_rgba(0,68,27,0.08)] ${tones[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  )
}

function PrimaryActionTile({ to, title, text, icon, secondary = false, featured = false }) {
  const palette = secondary
    ? 'border-[#3f7f23] bg-[#4c9a2a] text-white shadow-[0_5px_0_#3f7f23,0_14px_28px_rgba(76,154,42,0.18)] active:shadow-[0_2px_0_#3f7f23,0_8px_18px_rgba(76,154,42,0.15)]'
    : 'border-[#003915] bg-[#00441b] text-white shadow-[0_5px_0_#003915,0_16px_30px_rgba(0,68,27,0.22)] active:shadow-[0_2px_0_#003915,0_9px_18px_rgba(0,68,27,0.18)]'
  const sizeClass = featured
    ? 'min-h-[11rem] flex-col justify-center px-6 py-8 text-center sm:min-h-[13rem] sm:px-10'
    : 'min-h-[5rem] justify-between px-4 py-3'

  return (
    <Link
      to={to}
      className={`group flex w-full items-center gap-3 rounded-2xl border transition active:translate-y-[2px] ${sizeClass} ${palette}`}
    >
      <span className={`flex min-w-0 items-center gap-3 ${featured ? 'flex-col' : ''}`}>
        <span className={`flex shrink-0 items-center justify-center rounded-xl rounded-br-none border border-white/20 bg-white/10 text-white ${featured ? 'h-16 w-16 sm:h-20 sm:w-20' : 'h-12 w-12'}`}>
          <Icon name={icon} className={featured ? 'h-8 w-8 sm:h-10 sm:w-10' : 'h-5 w-5'} />
        </span>
        <span className="min-w-0">
          <span className={`block font-black leading-tight ${featured ? 'text-3xl sm:text-4xl' : 'text-base'}`}>{title}</span>
          <span className={`mt-2 block leading-6 text-white/86 ${featured ? 'text-base sm:text-lg' : 'text-sm'}`}>{text}</span>
        </span>
      </span>
      <Icon name="arrow" className={`shrink-0 transition group-hover:translate-x-1 ${featured ? 'mt-2 h-7 w-7' : 'h-5 w-5'}`} />
    </Link>
  )
}

function ReportTrackingPreview() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function fetchReports() {
      if (!localStorage.getItem('token')) {
        if (isMounted) {
          setLoading(false)
          setMessage('Please sign in to view your reports.')
        }
        return
      }

      try {
        const response = await api.get('/reports')
        if (isMounted) {
          setReports(Array.isArray(response.data?.reports) ? response.data.reports : [])
          setMessage(null)
        }
      } catch (error) {
        if (isMounted) {
          setMessage(toDisplayText(error?.response?.data?.error, 'Unable to load your reports right now.'))
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchReports()
    return () => {
      isMounted = false
    }
  }, [])

  const pendingReports = reports.filter((report) => ['pending', 'submitted', 'in_review'].includes(report.status)).length
  const resolvedReports = reports.filter((report) => report.status === 'resolved').length
  const previewReports = reports.slice(0, 3)

  return (
    <section className="w-full rounded-2xl border border-[#d7e0da] bg-white p-5 shadow-[0_12px_28px_rgba(0,68,27,0.1)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#00441b] text-white shadow-[0_6px_14px_rgba(0,68,27,0.22)]">
            <Icon name="report" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1a5e20]">Citizen Tracking</p>
            <h2 className="mt-1 text-3xl font-black leading-tight text-[#00441b]">My Reports</h2>
            <p className="mt-2 text-sm leading-6 text-[#495057]">Review submitted reports and check their current status.</p>
          </div>
        </div>
        <Link
          to="/myreports"
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#003915] bg-[#00441b] px-5 text-sm font-black text-white shadow-[0_3px_0_#003915] transition active:translate-y-[2px] active:shadow-[0_1px_0_#003915]"
        >
          View All
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatTile label="Total" value={reports.length} />
        <StatTile label="Pending" value={pendingReports} tone="pending" />
        <StatTile label="Resolved" value={resolvedReports} tone="resolved" />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1a5e20]">Report List</p>
          <h3 className="text-xl font-black text-[#00441b]">Submitted reports</h3>
        </div>
        <Link
          to="/submit"
          className="inline-flex min-h-12 items-center rounded-full border border-[#003915] bg-[#00441b] px-4 text-sm font-black text-white shadow-[0_3px_0_#003915] transition active:translate-y-[2px] active:shadow-[0_1px_0_#003915]"
        >
          New Report
        </Link>
      </div>

      {loading ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[#cfd8d3] bg-white px-5 py-8 text-center text-sm font-bold text-[#495057]">
          Loading reports...
        </div>
      ) : message ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[#cfd8d3] bg-white px-5 py-8 text-center text-sm font-semibold text-[#495057]">
          {message}
        </div>
      ) : previewReports.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[#cfd8d3] bg-white px-5 py-8 text-center shadow-[0_8px_18px_rgba(0,68,27,0.08)]">
          <p className="text-lg font-black text-[#00441b]">No reports found</p>
          <p className="mt-2 text-sm leading-6 text-[#495057]">Submitted reports will appear here once available.</p>
          <Link
            to="/submit"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full border border-[#003915] bg-[#00441b] px-6 text-sm font-black text-white shadow-[0_3px_0_#003915] transition active:translate-y-[2px] active:shadow-[0_1px_0_#003915]"
          >
            Submit Your First Report
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {previewReports.map((report) => (
            <article key={report.id} className="rounded-2xl border border-[#d7e0da] bg-white p-4 shadow-[0_8px_18px_rgba(0,68,27,0.08)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-base font-black leading-6 text-[#00441b]">{toDisplayText(report.violation_type, 'Untitled report')}</h4>
                  <p className="mt-1 font-mono text-xs font-black text-[#1a5e20]">{toDisplayText(report.reference_number)}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClasses(report.status)}`}>
                  {String(report.status || 'submitted').replaceAll('_', ' ')}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#495057]">{toDisplayText(report.description, 'No description')}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default function Home() {
  return (
    <div
      className="flex min-h-[calc(100vh-88px)] items-start overflow-x-hidden bg-[#fcfdfc] px-3 py-8 pb-20 text-[#212529]"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <main className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5">
        <section className="flex w-full">
          <PrimaryActionTile to="/submit" title="Submit New Report" text="Start a new environmental field report." icon="report" featured />
        </section>

        <ReportTrackingPreview />
      </main>
    </div>
  )
}
