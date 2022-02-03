import { DateTime } from 'luxon'

export function toUnixTimestamp(dt: DateTime) {
  return Math.trunc(dt.toSeconds())
}

export function getTomorrow() {
  return DateTime.utc().plus({ days: 1 })
}
