const AVATAR_TONES = [
  { bg: '#EBF3FA', text: '#1D4B75' },
  { bg: '#E6F4F1', text: '#115E59' },
  { bg: '#EEF2FF', text: '#3730A3' },
  { bg: '#FEF3C7', text: '#92400E' },
  { bg: '#FCE7F3', text: '#9D174D' },
  { bg: '#F1F5F9', text: '#334155' },
]

export function getInitials(username) {
  if (!username) return '?'
  const parts = String(username).split(/[._-\s]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return String(username).slice(0, 2).toUpperCase()
}

export function getAvatarTone(username) {
  const input = String(username || '')
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length]
}
