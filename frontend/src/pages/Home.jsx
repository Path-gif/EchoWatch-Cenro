import React from 'react'
import { Link } from 'react-router-dom'

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

const overviewItems = [
  {
    label: 'Description',
    text: 'This platform serves as a secure digital portal for environmental reporting and data management.',
  },
  {
    label: 'Use',
    text: 'Authorized users can utilize this dashboard to submit detailed field reports, track submission statuses, and maintain their professional profiles.',
  },
  {
    label: 'Significance',
    text: 'By digitizing the reporting workflow, this system enhances data integrity, speeds up administrative processing, and supports transparent environmental monitoring initiatives.',
  },
]

const quickLinks = [
  { label: 'My Reports', helper: 'Review submitted reports and current status.', to: '/myreports' },
  { label: 'Account Access', helper: 'Review and update your citizen profile.', to: '/editprofile' },
]

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

function PrimaryActionTile({ to, title, text, icon, secondary = false }) {
  const palette = secondary
    ? 'border-[#3f7f23] bg-[#4c9a2a] text-white shadow-[0_5px_0_#3f7f23,0_14px_28px_rgba(76,154,42,0.18)] active:shadow-[0_2px_0_#3f7f23,0_8px_18px_rgba(76,154,42,0.15)]'
    : 'border-[#003915] bg-[#00441b] text-white shadow-[0_5px_0_#003915,0_16px_30px_rgba(0,68,27,0.22)] active:shadow-[0_2px_0_#003915,0_9px_18px_rgba(0,68,27,0.18)]'

  return (
    <Link
      to={to}
      className={`group flex min-h-[5rem] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition active:translate-y-[2px] ${palette}`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl rounded-br-none border border-white/20 bg-white/10 text-white">
          <Icon name={icon} />
        </span>
        <span className="min-w-0">
          <span className="block text-base font-black leading-5">{title}</span>
          <span className="mt-1 block text-sm leading-5 text-white/86">{text}</span>
        </span>
      </span>
      <Icon name="arrow" className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" />
    </Link>
  )
}

export default function Home() {
  const user = readUser()

  return (
    <div
      className="min-h-[calc(100vh-88px)] overflow-x-hidden bg-[#fcfdfc] px-3 py-3 pb-20 text-[#212529]"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-3">
        <section className="rounded-2xl rounded-tr-none border border-[#d7e0da] bg-white p-5 shadow-[0_12px_28px_rgba(0,68,27,0.1)] sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1a5e20]">Official Environmental Portal</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[#00441b] sm:text-4xl">Official Environmental Portal</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#495057]">
            {user?.name ? `Active user: ${user.name}. ` : ''}
            This platform serves as a secure digital portal for environmental reporting and data management.
          </p>
        </section>

        <section className="grid gap-3">
          {overviewItems.map((item, index) => (
            <article
              key={item.label}
              className={`rounded-2xl border border-[#d7e0da] bg-white p-4 shadow-[0_8px_18px_rgba(0,68,27,0.08)] ${
                index % 2 === 0 ? 'rounded-tr-none' : 'rounded-tl-none'
              }`}
            >
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1a5e20]">{item.label}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#495057]">{item.text}</p>
            </article>
          ))}
        </section>

        <section className="grid w-full gap-3 md:grid-cols-2">
          <PrimaryActionTile to="/submit" title="Submit New Report" text="Submit a detailed environmental field report." icon="report" />
          <PrimaryActionTile to="/editprofile" title="View Profile" text="Maintain your professional profile information." icon="profile" secondary />
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {quickLinks.map((item, index) => (
            <Link
              key={item.label}
              to={item.to}
              className={`flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-[#d7e0da] bg-white px-4 py-3 text-[#212529] shadow-[0_8px_18px_rgba(0,68,27,0.08)] transition active:translate-y-[2px] ${
                index % 2 === 0 ? 'rounded-tr-none' : 'rounded-tl-none'
              }`}
            >
              <span>
                <span className="block text-sm font-black text-[#00441b]">{item.label}</span>
                <span className="mt-1 block text-sm leading-5 text-[#495057]">{item.helper}</span>
              </span>
              <Icon name="arrow" className="h-5 w-5 shrink-0 text-[#1a5e20]" />
            </Link>
          ))}
        </section>
      </main>
    </div>
  )
}
