export function cleanEchidnaLogString(s: string) {
  return s.trim().replace(/^[^a-zA-Z]+/, '').replace(/[^\w\d]+$/, '')
}
