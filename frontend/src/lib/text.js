export function toDisplayText(value, fallback = '') {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => toDisplayText(item)).filter(Boolean).join(', ') || fallback
  }

  if (typeof value === 'object') {
    return toDisplayText(value.message || value.error || value.code || JSON.stringify(value), fallback)
  }

  return fallback
}

export function normalizeUser(user) {
  if (!user || typeof user !== 'object') {
    return null
  }

  return {
    ...user,
    id: user.id,
    name: toDisplayText(user.name || user.full_name, ''),
    phone: toDisplayText(user.phone, ''),
    email: toDisplayText(user.email, ''),
    municipality: toDisplayText(user.municipality, ''),
  }
}
