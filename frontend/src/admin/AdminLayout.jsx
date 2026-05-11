import React from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'

function Icon({ name }) {
  const paths = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    reports: (
      <>
        <path d="M8 3h6l4 4v14H6V3h2Z" />
        <path d="M14 3v5h4" />
        <path d="M9 13h6" />
        <path d="M9 17h4" />
      </>
    ),
    logout: <path d="M14 7l5 5-5 5M19 12H9M11 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5" />,
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

const navItems = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: 'dashboard' },
  { label: 'Reports', to: '/admin/reports', icon: 'reports' },
]

export default function AdminLayout() {
  const navigate = useNavigate()

  function handleSignOut() {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-[#edf1ef] text-[#17261f] lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 z-40 border-b border-[#0d2d23]/15 bg-[#123629] text-white shadow-lg lg:h-screen lg:border-b-0 lg:border-r lg:border-white/10">
        <div className="flex min-h-[76px] items-center justify-between gap-3 px-4 py-3 lg:min-h-0 lg:flex-col lg:items-stretch lg:px-5 lg:py-6">
          <Link to="/" aria-label="Go to landing page" className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-white/25">
              <img src="/ecowatch-logo.svg" alt="EcoWatch logo" className="h-11 w-11 rounded-full object-contain" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d9c273]">DENR Cenro</span>
              <span className="block truncate text-xl font-black">Admin Portal</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-semibold text-white transition hover:bg-white/10 lg:hidden"
          >
            <Icon name="logout" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-4 pb-3 lg:mt-3 lg:grid lg:gap-2 lg:overflow-visible lg:px-5 lg:pb-0">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `inline-flex min-h-12 shrink-0 items-center gap-3 rounded-xl px-4 text-sm font-black transition ${
                  isActive
                    ? 'bg-white text-[#123629] shadow-sm'
                    : 'border border-white/10 bg-white/5 text-emerald-50 hover:bg-white/10'
                }`
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto hidden px-5 pb-6 pt-4 lg:block">
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <Icon name="logout" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="min-w-0 px-3 py-4 sm:px-6 lg:px-8 lg:py-6">
        <Outlet />
      </main>
    </div>
  )
}
