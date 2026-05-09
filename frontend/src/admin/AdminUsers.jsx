import React from 'react'

export default function AdminUsers() {
  return (
    <div className="rounded-[2rem] border border-[#d5dfda] bg-white p-6 shadow-[0_20px_60px_rgba(17,56,42,0.10)] sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0f5f46]">Users</p>
      <h2 className="mt-3 text-3xl font-black text-[#123629]">User Management</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
        This page is reserved for future management of citizen accounts, user access reviews, and administrative user operations.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {[
          ['Citizen Accounts', 'Placeholder for user lists, account status, and verification tools.'],
          ['Administrative Access', 'Placeholder for access levels, role controls, and account governance.'],
        ].map(([title, copy]) => (
          <div key={title} className="rounded-[1.5rem] border border-[#d9e3dc] bg-[#f8fbf9] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0f5f46]">{title}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{copy}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
