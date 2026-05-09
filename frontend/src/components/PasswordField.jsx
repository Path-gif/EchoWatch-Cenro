import React, { useId, useState } from 'react'

function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M3 3l18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.6 5.2A11.3 11.3 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.1 4.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.7 6.7C4 8.5 2 12 2 12s3.5 7 10 7c1.8 0 3.3-.4 4.7-1.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.9 9.9A3 3 0 0 0 14.1 14.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  name,
  autoComplete,
  required = true,
  className = '',
  labelClassName = '',
}) {
  const generatedId = useId()
  const fieldId = id || generatedId
  const [visible, setVisible] = useState(false)

  return (
    <div>
      {label ? (
        <label htmlFor={fieldId} className={`mb-2 block text-sm font-bold text-[#212529] ${labelClassName}`.trim()}>
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={fieldId}
          name={name}
          type={visible ? 'text' : 'password'}
          required={required}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`min-h-12 w-full rounded-xl rounded-tr-none border border-[#cfd8d3] bg-white px-4 py-3 pr-12 text-[#212529] shadow-[inset_0_2px_6px_rgba(0,68,27,0.08)] outline-none transition placeholder:text-[#6c757d] focus:border-[#1a5e20] focus:ring-3 focus:ring-[#4c9a2a]/20 ${className}`.trim()}
        />
        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#495057] transition hover:bg-[#eef6ea] hover:text-[#1a5e20] focus:outline-none focus:ring-2 focus:ring-[#4c9a2a]/35"
        >
          <EyeIcon visible={visible} />
        </button>
      </div>
    </div>
  )
}
