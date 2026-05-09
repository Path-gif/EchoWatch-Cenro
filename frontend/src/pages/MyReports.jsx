import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'

function statusClasses(status) {
  if (status === 'resolved') return 'border-[#b9d7b3] bg-[#eef6ea] text-[#1a5e20]'
  if (['pending', 'submitted', 'in_review'].includes(status)) return 'border-[#c6d8bd] bg-[#f4f8f1] text-[#33691e]'
  return 'border-[#d4d9dd] bg-[#f8f9fa] text-[#495057]'
}

function ReportIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6l4 4v14H5V3h4Z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 13h7" />
      <path d="M8.5 17h5" />
    </svg>
  )
}

function StatTile({ label, value, tone = 'indigo' }) {
  const tones = {
    indigo: 'border-[#cfd8d3] bg-white text-[#00441b]',
    terracotta: 'border-[#c6d8bd] bg-[#f4f8f1] text-[#1a5e20]',
    sage: 'border-[#b9d7b3] bg-[#eef6ea] text-[#1a5e20]',
  }

  return (
    <div className={`rounded-xl rounded-tr-none border p-4 shadow-[0_8px_18px_rgba(0,68,27,0.08)] ${tones[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
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

export default function MyReports() {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [searchRef, setSearchRef] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    const fetchReports = async () => {
      if (!localStorage.getItem('token')) {
        setMessage('Please sign in to view your reports.')
        setLoading(false)
        return
      }

      try {
        const response = await api.get('/reports')
        setReports(response.data?.reports || [])
      } catch (error) {
        if (error?.response?.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setMessage('Your session expired. Please sign in again.')
        } else {
          setMessage(error?.response?.data?.error || 'Failed to fetch reports.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [])

  const filteredReports = useMemo(() => {
    const value = searchRef.trim().toLowerCase()
    if (!value) return reports
    return reports.filter((report) => String(report.reference_number || '').toLowerCase().includes(value))
  }, [reports, searchRef])

  const totalReports = reports.length
  const pendingReports = reports.filter((report) => ['pending', 'submitted', 'in_review'].includes(report.status)).length
  const resolvedReports = reports.filter((report) => report.status === 'resolved').length

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-88px)] bg-[#f8f9fa] px-4 py-10 text-center text-sm font-bold text-[#495057]">
        Loading reports...
      </div>
    )
  }

  return (
    <div
      className="min-h-[calc(100vh-88px)] bg-[#f8f9fa] px-3 py-4 pb-24 text-[#212529]"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <ReturnToDashboardButton onClick={() => navigate('/home')} />

        <section className="rounded-2xl rounded-tr-none border border-[#d7e0da] bg-white p-5 shadow-[0_12px_28px_rgba(0,68,27,0.1)]">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl rounded-br-none bg-[#00441b] text-white shadow-[0_6px_14px_rgba(0,68,27,0.22)]">
              <ReportIcon />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1a5e20]">Citizen Tracking</p>
              <h1 className="mt-1 text-3xl font-black leading-tight text-[#00441b]">My Reports</h1>
              <p className="mt-2 text-sm leading-6 text-[#495057]">Search submitted reports and check their current status.</p>
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-xl rounded-tr-none border border-[#cfd8d3] bg-white px-4 py-3 text-sm font-semibold text-[#212529] shadow-[0_6px_16px_rgba(0,68,27,0.08)]">
            {message}
            {!localStorage.getItem('token') && (
              <button type="button" onClick={() => navigate('/login', { replace: true })} className="ml-3 min-h-12 font-black text-[#1a5e20] underline underline-offset-4">
                Sign in
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Total" value={totalReports} />
          <StatTile label="Pending" value={pendingReports} tone="terracotta" />
          <StatTile label="Resolved" value={resolvedReports} tone="sage" />
        </div>

        <section className="rounded-2xl rounded-tl-none border border-[#d7e0da] bg-white p-4 shadow-[0_10px_24px_rgba(0,68,27,0.08)]">
          <label className="mb-2 block text-sm font-bold text-[#212529]">Search by reference number</label>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              type="text"
              placeholder="Example: OLO-2026-0001"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              className="min-h-12 w-full rounded-xl rounded-tr-none border border-[#cfd8d3] bg-white px-4 py-3 text-[#212529] shadow-[inset_0_2px_6px_rgba(0,68,27,0.08)] outline-none transition placeholder:text-[#6c757d] focus:border-[#1a5e20] focus:ring-3 focus:ring-[#4c9a2a]/20"
            />
            <button
              type="button"
              onClick={() => setSearchRef('')}
              className="min-h-12 rounded-full border border-[#cfd8d3] bg-white px-5 text-sm font-black text-[#1a5e20] shadow-[0_3px_0_#cfd8d3] transition active:translate-y-[2px] active:shadow-[0_1px_0_#cfd8d3]"
            >
              Clear
            </button>
          </div>
        </section>

        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1a5e20]">Report List</p>
            <h2 className="text-xl font-black text-[#00441b]">Submitted reports</h2>
          </div>
          <Link
            to="/submit"
            className="inline-flex min-h-12 items-center rounded-full border border-[#003915] bg-[#00441b] px-4 text-sm font-black text-white shadow-[0_3px_0_#003915] transition active:translate-y-[2px] active:shadow-[0_1px_0_#003915]"
          >
            New Report
          </Link>
        </div>

        {filteredReports.length === 0 ? (
          <section className="rounded-2xl rounded-tr-none border border-dashed border-[#cfd8d3] bg-white px-5 py-8 text-center shadow-[0_8px_18px_rgba(0,68,27,0.08)]">
            <p className="text-lg font-black text-[#00441b]">No reports found</p>
            <p className="mt-2 text-sm leading-6 text-[#495057]">No report matches the current reference number.</p>
            <Link
              to="/submit"
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full border border-[#003915] bg-[#00441b] px-6 text-sm font-black text-white shadow-[0_3px_0_#003915] transition active:translate-y-[2px] active:shadow-[0_1px_0_#003915]"
            >
              Submit Your First Report
            </Link>
          </section>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report, index) => (
              <article
                key={report.id}
                className={`rounded-2xl border border-[#d7e0da] bg-white p-4 shadow-[0_8px_18px_rgba(0,68,27,0.08)] ${
                  index % 2 === 0 ? 'rounded-tr-none' : 'rounded-tl-none'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-black leading-6 text-[#00441b]">{report.violation_type}</h3>
                    <p className="mt-1 font-mono text-xs font-black text-[#1a5e20]">{report.reference_number}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClasses(report.status)}`}>
                    {String(report.status || '').replaceAll('_', ' ')}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-[#495057]">{report.description}</p>

                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-xl rounded-tr-none border border-[#d7e0da] bg-[#f8f9fa] px-3 py-2">
                    <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-[#6c757d]">Location</dt>
                    <dd className="mt-1 font-semibold text-[#212529]">
                      {report.manual_location || [report.latitude, report.longitude].filter(Boolean).join(', ') || 'Not provided'}
                    </dd>
                  </div>
                  <div className="rounded-xl rounded-tr-none border border-[#d7e0da] bg-[#f8f9fa] px-3 py-2">
                    <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-[#6c757d]">Submitted</dt>
                    <dd className="mt-1 font-semibold text-[#212529]">{new Date(report.created_at).toLocaleDateString()}</dd>
                  </div>
                  <div className="rounded-xl rounded-tr-none border border-[#d7e0da] bg-[#f8f9fa] px-3 py-2">
                    <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-[#6c757d]">Identity</dt>
                    <dd className="mt-1 font-semibold text-[#212529]">{report.is_anonymous ? 'Anonymous name' : 'Named'}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
