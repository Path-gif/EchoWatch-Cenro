import React, { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M14 7l5 5-5 5M19 12H9M11 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const lastScrollY = useRef(0)
  const [headerHidden, setHeaderHidden] = useState(false)

  useEffect(() => {
    function handleScroll() {
      const currentScrollY = window.scrollY
      const scrollingDown = currentScrollY > lastScrollY.current

      setHeaderHidden(scrollingDown && currentScrollY > 16)
      lastScrollY.current = Math.max(currentScrollY, 0)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#edf1ef]">
      <header
        className={`sticky top-0 z-40 border-b border-[#0d2d23]/20 bg-[#16382d] text-white shadow-lg transition-transform duration-300 ease-out ${
          headerHidden ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="flex min-h-[78px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              aria-label="Go to landing page"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-white/25 transition hover:scale-105"
            >
              <img src="/ecowatch-logo.svg" alt="EcoWatch logo" className="h-11 w-11 rounded-full object-contain" />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d9c273]">DENR Cenro</p>
              <h1 className="truncate text-xl font-bold sm:text-2xl">Admin Portal</h1>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/"
              className="flex items-center justify-center rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Landing Page
            </Link>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('admin_token')
                localStorage.removeItem('admin_user')
                navigate('/admin/login')
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <SignOutIcon />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="min-w-0 px-3 py-4 sm:px-6 lg:px-8 lg:py-6">
        <Outlet />
      </main>
    </div>
  )
}
