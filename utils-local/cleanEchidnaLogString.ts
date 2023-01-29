export function cleanEchidnaLogString(s: string) {
  return s.trim().replace(/^[^a-zA-Z/]+/, '').replace(/[^\w\d/]+$/, '')
}

export function filterEchidnaLogString(s: string) {
  return s && !startsWithComment(s)
}

function startsWithComment(s: string) {
  return s.startsWith('//')
}
