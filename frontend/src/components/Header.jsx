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

function readDismissedNotifications() {
  try {
    return JSON.parse(localStorage.getItem('dismissed_report_notifications') || '[]')
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

function SidebarIcon({ name }) {
  const paths = {
    dashboard: (
      <>
        <path d="M4 5h6v6H4V5Z" />
        <path d="M14 5h6v6h-6V5Z" />
        <path d="M4 15h6v4H4v-4Z" />
        <path d="M14 15h6v4h-6v-4Z" />
      </>
    ),
    report: (
      <>
        <path d="M9 3h6l4 4v14H5V3h4Z" />
        <path d="M14 3v5h5" />
        <path d="M8.5 13h7" />
        <path d="M8.5 17h5" />
      </>
    ),
    list: (
      <>
        <path d="M8 6h12" />
        <path d="M8 12h12" />
        <path d="M8 18h12" />
        <path d="M4 6h.01" />
        <path d="M4 12h.01" />
        <path d="M4 18h.01" />
      </>
    ),
    profile: (
      <>
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </>
    ),
    login: (
      <>
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
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

function SidebarLink({ icon, children, to }) {
  return (
    <Link
      to={to}
      title={typeof children === 'string' ? children : undefined}
      className="flex min-h-12 items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-sm font-black transition hover:bg-white/15 md:justify-start md:px-4"
    >
      <SidebarIcon name={icon} />
      <span className="hidden md:inline">{children}</span>
    </Link>
  )
}

function MobileNavLink({ icon, children, to }) {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-black transition ${
        isActive ? 'bg-[#00441b] text-white shadow-[0_3px_0_#003915]' : 'text-[#123629] hover:bg-[#eef6ea]'
      }`}
    >
      <SidebarIcon name={icon} />
      <span className="w-full truncate text-center">{children}</span>
    </Link>
  )
}

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState(readUser())
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [seenNotifications, setSeenNotifications] = useState(readSeenNotifications())
  const [dismissedNotifications, setDismissedNotifications] = useState(readDismissedNotifications())
  const isAuthenticated = Boolean(localStorage.getItem('token'))
  const unreadCount = notifications.filter((item) => !seenNotifications.includes(item.id)).length

  useEffect(() => {
    setUser(readUser())
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
          const dismissed = readDismissedNotifications()
          const nextNotifications = Array.isArray(response.data?.notifications) ? response.data.notifications : []
          setDismissedNotifications(dismissed)
          setNotifications(nextNotifications.filter((item) => !dismissed.includes(item.id)))
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
  }

  function handleDismissNotification(notificationId) {
    const nextDismissed = Array.from(new Set([...dismissedNotifications, notificationId]))
    const nextSeen = Array.from(new Set([...seenNotifications, notificationId]))

    localStorage.setItem('dismissed_report_notifications', JSON.stringify(nextDismissed))
    localStorage.setItem('seen_report_notifications', JSON.stringify(nextSeen))
    setDismissedNotifications(nextDismissed)
    setSeenNotifications(nextSeen)
    setNotifications((items) => items.filter((item) => item.id !== notificationId))
    setNotificationOpen(false)
  }

  function handleLogout() {
    localStorage.clear()
    sessionStorage.clear()
    setUser(null)
    setNotificationOpen(false)
    setNotifications([])
    navigate('/', { replace: true })
  }

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-30 border-b border-emerald-950/10 bg-[#0f5f46] px-3 py-3 text-white shadow-lg md:left-64 md:px-5">
        <div className="flex min-h-14 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[#e5c76b] sm:text-[11px] sm:tracking-[0.2em]">EcoWatch Citizen Portal</p>
            <h1 className="truncate text-base font-black sm:text-xl">Environmental Reporting Dashboard</h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  aria-label="Open report notifications"
                  aria-expanded={notificationOpen}
                  onClick={handleToggleNotifications}
                  className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#003915] bg-[#00441b] text-white shadow-[0_3px_0_#003915,0_10px_22px_rgba(0,38,15,0.18)] transition hover:bg-[#083f1d] sm:h-12 sm:w-12"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0m6 0H9" />
                  </svg>
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e5c76b] px-1 text-[11px] font-black text-[#0b3f30]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  ) : null}
                </button>

                {notificationOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/15 bg-[#25765b] text-white shadow-2xl ring-1 ring-black/10 sm:w-[22rem]">
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
                            onClick={() => handleDismissNotification(item.id)}
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
            ) : null}
          </div>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[#123629] text-white shadow-xl md:flex">
      <div className="px-5 py-6">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-white/30">
            <img src="/ecowatch-logo.svg" alt="EcoWatch logo" className="h-12 w-12 rounded-full object-contain" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xl font-black">EcoWatch</span>
            <span className="block truncate text-sm font-semibold text-emerald-50/85">
              {user?.name ? `Hi, ${toDisplayText(user.name)}` : 'Citizen Portal'}
            </span>
          </span>
        </div>
      </div>

      <div className="mx-5 border-t border-white/15" />

      <nav className="grid gap-2 px-4 py-5">
        {!isAuthenticated ? (
          <SidebarLink to="/login" icon="login">
            Sign In
          </SidebarLink>
        ) : (
          <>
            <SidebarLink to="/home" icon="dashboard">
              Dashboard
            </SidebarLink>
            <SidebarLink to="/submit" icon="report">
              Submit Report
            </SidebarLink>
            <SidebarLink to="/myreports" icon="list">
              My Report
            </SidebarLink>
            <SidebarLink to="/editprofile" icon="profile">
              Edit Profile
            </SidebarLink>
          </>
        )}
      </nav>

      {isAuthenticated ? (
        <div className="mt-auto p-4">
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-red-200/20 bg-red-500/10 px-4 text-left text-sm font-black text-red-100 transition hover:bg-red-500/15"
          >
            <SidebarIcon name="logout" />
            <span>Logout</span>
          </button>
        </div>
      ) : null}
      </aside>

      {isAuthenticated ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#d7e0da] bg-white/95 px-2 py-2 shadow-[0_-10px_30px_rgba(0,68,27,0.12)] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-lg gap-1">
            <MobileNavLink to="/home" icon="dashboard">Home</MobileNavLink>
            <MobileNavLink to="/submit" icon="report">Submit</MobileNavLink>
            <MobileNavLink to="/myreports" icon="list">Reports</MobileNavLink>
            <MobileNavLink to="/editprofile" icon="profile">Profile</MobileNavLink>
          </div>
        </nav>
      ) : null}
    </>
  )
}
