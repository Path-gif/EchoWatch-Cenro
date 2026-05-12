import React, { useEffect, useState } from 'react'
import api from '../lib/api'
import { toDisplayText } from '../lib/text'

function formatTimestamp(value) {
  if (!value) return 'Never'
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function fetchUsers() {
      setLoading(true)
      try {
        const response = await api.get('/admin/users')
        if (isMounted) {
          setUsers(Array.isArray(response.data?.users) ? response.data.users : [])
          setMessage(null)
        }
      } catch (error) {
        if (isMounted) setMessage(toDisplayText(error?.response?.data?.error, 'Unable to load registered users.'))
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchUsers()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="space-y-4">
      <section className="rounded-[1.6rem] border border-[#d5dfda] bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0f5f46]">Registered Citizens</p>
        <h2 className="mt-3 text-3xl font-black text-[#123629]">Registered Users</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
          View the people who created citizen accounts in the EcoWatch reporting portal.
        </p>
      </section>

      {message ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          {message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[1.6rem] border border-[#d5dfda] bg-white shadow-sm">
        <div className="border-b border-[#e5ece8] px-5 py-4">
          <p className="text-sm font-black text-[#123629]">{users.length} person{users.length === 1 ? '' : 's'} registered</p>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm font-semibold text-slate-500">Loading registered users...</div>
        ) : users.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm font-semibold text-slate-500">No registered users yet.</div>
        ) : (
          <>
          <div className="grid gap-3 p-4 md:hidden">
            {users.map((user) => (
              <article key={user.id} className="rounded-2xl border border-[#dbe4df] bg-white p-4 shadow-sm">
                <p className="text-base font-black text-[#123629]">{toDisplayText(user.full_name, 'Unnamed citizen')}</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-700">
                  <div className="rounded-xl border border-[#eef2ef] bg-[#f8fbf9] px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Email</p>
                    <p className="mt-1 break-words font-semibold">{toDisplayText(user.email, 'No email')}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#eef2ef] bg-[#f8fbf9] px-3 py-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Phone</p>
                      <p className="mt-1 font-semibold">{toDisplayText(user.phone, 'No phone')}</p>
                    </div>
                    <div className="rounded-xl border border-[#eef2ef] bg-[#f8fbf9] px-3 py-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Municipality</p>
                      <p className="mt-1 font-semibold">{toDisplayText(user.municipality, 'Not set')}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#eef2ef] bg-[#f8fbf9] px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Registered</p>
                    <p className="mt-1 font-semibold">{formatTimestamp(user.created_at)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-[#e5ece8]">
              <thead className="bg-[#f7faf8]">
                <tr className="text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-600">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Municipality</th>
                  <th className="px-6 py-4">Registered</th>
                  <th className="px-6 py-4">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2ef] bg-white">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#fafcfb]">
                    <td className="px-6 py-4 text-sm font-black text-[#123629]">{toDisplayText(user.full_name, 'Unnamed citizen')}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{toDisplayText(user.email, 'No email')}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{toDisplayText(user.phone, 'No phone')}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{toDisplayText(user.municipality, 'Not set')}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{formatTimestamp(user.created_at)}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{formatTimestamp(user.last_login)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  )
}
