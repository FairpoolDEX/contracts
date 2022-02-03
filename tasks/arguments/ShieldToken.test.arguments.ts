import { getTomorrow, toUnixTimestamp } from '../../util/luxon'

// simulate release on the next day
const releaseTime = toUnixTimestamp(getTomorrow())

export default [releaseTime]
