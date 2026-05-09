import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { normalizeUser, toDisplayText } from '../lib/text'

function readUser() {
  try {
    return normalizeUser(JSON.parse(localStorage.getItem('user') || 'null'))
  } catch {
    return null
  }
}

function readSeenNotifications() {
  try {
    return JSON.parse(localStorage.getItem('seen_report_notifications') || '[]')
  } catch {
    return []
  }
}

function formatNotificationDate(value) {
  if (!value) return 'Just now'
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState(readUser())
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [seenNotifications, setSeenNotifications] = useState(readSeenNotifications())
  const isAuthenticated = Boolean(localStorage.getItem('token'))
  const unreadCount = notifications.filter((item) => !seenNotifications.includes(item.id)).length

  useEffect(() => {
    setUser(readUser())
    setMenuOpen(false)
    setNotificationOpen(false)

    function handleUserUpdated() {
      setUser(readUser())
    }

    window.addEventListener('user-updated', handleUserUpdated)
    return () => window.removeEventListener('user-updated', handleUserUpdated)
  }, [location.pathname])

  useEffect(() => {
    let isMounted = true

    async function fetchNotifications() {
      if (!localStorage.getItem('token')) {
        setNotifications([])
        return
      }

      try {
        const response = await api.get('/reports/notifications')
        if (isMounted) {
          setNotifications(Array.isArray(response.data?.notifications) ? response.data.notifications : [])
        }
      } catch {
        if (isMounted) {
          setNotifications([])
        }
      }
    }

    fetchNotifications()
    const intervalId = window.setInterval(fetchNotifications, 30000)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [isAuthenticated])

  function handleToggleNotifications() {
    setNotificationOpen((value) => {
      const nextValue = !value

      if (nextValue && unreadCount > 0) {
        const nextSeen = Array.from(new Set([...seenNotifications, ...notifications.map((item) => item.id)]))
        localStorage.setItem('seen_report_notifications', JSON.stringify(nextSeen))
        setSeenNotifications(nextSeen)
      }

      return nextValue
    })
    setMenuOpen(false)
  }

  function handleLogout() {
    localStorage.clear()
    sessionStorage.clear()
    setUser(null)
    setMenuOpen(false)
    setNotificationOpen(false)
    setNotifications([])
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 shadow-lg">
      <div className="border-b border-[#d5d5d5] bg-[#f5f5f5] text-[#1f1f1f]">
        <div className="flex h-10 w-full items-center justify-between px-4 text-xs sm:px-6 lg:px-8">
          <div className="font-semibold uppercase tracking-[0.22em] text-[#4f4f4f]">GOVPH</div>
          <div className="hidden text-[11px] text-[#5c5c5c] sm:block">Official regional portal reference styling adapted for citizen reporting</div>
        </div>
      </div>

      <div className="relative border-b border-emerald-950/10 bg-[#0f5f46] text-white">
        <div className="flex min-h-[78px] w-full items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              aria-label="Go to landing page"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-white/30 transition hover:scale-105"
            >
              <img src="/ecowatch-logo.svg" alt="EcoWatch logo" className="h-[44px] w-[44px] rounded-full object-contain" />
            </Link>
            <Link to={isAuthenticated ? '/home' : '/login'} className="min-w-0 self-center leading-tight">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-[#e5c76b] sm:text-xs">Republic of the Philippines</p>
              <h1 className="truncate text-lg font-bold sm:text-[1.6rem] sm:leading-[1.15] lg:text-[1.75rem]">DENR CENRO</h1>
              <p className="truncate pt-1 text-base font-medium text-emerald-100/90">
                {user?.name ? `Hi, ${toDisplayText(user.name)}` : 'Citizen portal for verified environmental monitoring reports'}
              </p>
            </Link>
          </div>

          {!isAuthenticated ? (
            <div className="flex shrink-0 items-center gap-2">
              <Link
                to="/admin-login"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Admin Login
              </Link>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  aria-label="Open report notifications"
                  aria-expanded={notificationOpen}
                  onClick={handleToggleNotifications}
                  className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#003915] bg-[#00441b] text-white shadow-[0_3px_0_#003915,0_10px_22px_rgba(0,38,15,0.18)] transition hover:bg-[#083f1d] active:translate-y-[2px] active:shadow-[0_1px_0_#003915,0_6px_14px_rgba(0,38,15,0.16)]"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e5c76b] px-1 text-[11px] font-black text-[#0b3f30]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notificationOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/15 bg-[#25765b] text-white shadow-2xl ring-1 ring-black/10">
                    <div className="border-b border-white/10 px-4 py-3">
                      <p className="text-sm font-bold">Report Notifications</p>
                      <p className="mt-1 text-xs text-emerald-50/80">Completed report activity appears here.</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-2">
                      {notifications.length === 0 ? (
                        <div className="rounded-xl px-4 py-6 text-sm text-emerald-50/80">
                          No completed report activity yet.
                        </div>
                      ) : (
                        notifications.map((item) => (
                          <Link
                            key={item.id}
                            to="/myreports"
                            onClick={() => setNotificationOpen(false)}
                            className="block rounded-xl px-4 py-3 transition hover:bg-white/10"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-bold">{toDisplayText(item.title, 'Report update')}</p>
                              {!seenNotifications.includes(item.id) && <span className="mt-1 h-2 w-2 rounded-full bg-[#e5c76b]" />}
                            </div>
                            <p className="mt-1 text-sm text-emerald-50/90">{toDisplayText(item.message, 'A report was updated.')}</p>
                            {item.notes && <p className="mt-1 line-clamp-2 text-xs text-emerald-50/75">{toDisplayText(item.notes)}</p>}
                            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#e5c76b]">
                              {formatNotificationDate(item.created_at)}
                            </p>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  aria-label="Toggle citizen menu"
                  aria-expanded={menuOpen}
                  onClick={() => {
                    setMenuOpen((value) => !value)
                    setNotificationOpen(false)
                  }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#003915] bg-[#00441b] px-4 text-sm font-black text-white shadow-[0_3px_0_#003915,0_10px_22px_rgba(0,38,15,0.18)] transition hover:bg-[#083f1d] active:translate-y-[2px] active:shadow-[0_1px_0_#003915,0_6px_14px_rgba(0,38,15,0.16)]"
                >
                  <span className="hidden sm:inline">Menu</span>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {menuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-52 rounded-2xl border border-white/15 bg-[#25765b] p-2 text-white shadow-2xl ring-1 ring-black/10">
                    <div className="grid gap-1">
                      <Link to="/submit" className="rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-white/10">
                        Submit Report
                      </Link>
                      <Link to="/myreports" className="rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-white/10">
                        My Report
                      </Link>
                      <Link to="/editprofile" className="rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-white/10">
                        Edit Profile
                      </Link>
                      <button type="button" onClick={handleLogout} className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-100 transition hover:bg-white/10">
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
