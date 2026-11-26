/**
 * Utilities for parsing, sorting, and formatting Cloud Database timestamps.
 * Uses Temporal.Instant when available to preserve sub-millisecond precision
 * from PostgreSQL / Supabase, with a safe ISO fallback for browsers without Temporal.
 */

export function normalizeIsoTimestamp(raw) {
  if (!raw) return null
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  let iso = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T')
  if (/[+-]\d{2}$/.test(iso)) {
    iso = `${iso}:00`
  } else if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(iso)) {
    iso = `${iso}Z`
  }
  return iso
}

export function parseCloudTimestampMs(raw) {
  const iso = normalizeIsoTimestamp(raw)
  if (!iso) return null
  if (typeof globalThis.Temporal !== 'undefined') {
    try {
      return Number(globalThis.Temporal.Instant.from(iso).epochMilliseconds)
    } catch {
      // Fallback below
    }
  }
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? null : ms
}

export function compareCloudTimestamps(aRaw, bRaw) {
  const aIso = normalizeIsoTimestamp(aRaw)
  const bIso = normalizeIsoTimestamp(bRaw)
  if (!aIso && !bIso) return 0
  if (!aIso) return -1
  if (!bIso) return 1

  if (typeof globalThis.Temporal !== 'undefined') {
    try {
      return globalThis.Temporal.Instant.compare(
        globalThis.Temporal.Instant.from(aIso),
        globalThis.Temporal.Instant.from(bIso),
      )
    } catch {
      // Fallback below
    }
  }

  const aMs = Date.parse(aIso)
  const bMs = Date.parse(bIso)
  if (!Number.isNaN(aMs) && !Number.isNaN(bMs) && aMs !== bMs) {
    return aMs - bMs
  }
  return aIso.localeCompare(bIso)
}

export function sortByCloudTimestamp(items, field = 'sent_at') {
  return [...items].sort((a, b) => compareCloudTimestamps(a?.[field], b?.[field]))
}

export function formatCloudTimeOnly(dateOrMs) {
  const date = dateOrMs instanceof Date ? dateOrMs : new Date(dateOrMs)
  if (Number.isNaN(date.getTime())) return '--:--:--'
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(/\./g, ':')
}

export function formatCloudBubbleTime(raw) {
  const ms = parseCloudTimestampMs(raw)
  if (ms === null) return ''
  const date = new Date(ms)
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(/\./g, ':')
}

export function getCloudDateKey(raw) {
  const ms = parseCloudTimestampMs(raw)
  if (ms === null) return null
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatCloudDateLabel(raw) {
  const ms = parseCloudTimestampMs(raw)
  if (ms === null) return ''
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(ms))
}

export function formatCloudFullTimestamp(raw) {
  const ms = parseCloudTimestampMs(raw)
  if (ms === null) return raw || '-'
  const date = new Date(ms)
  const datePart = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
  return `${datePart} · ${formatCloudTimeOnly(date)}`
}
