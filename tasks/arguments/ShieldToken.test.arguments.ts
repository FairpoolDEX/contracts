import { getTomorrow, toUnixTimestamp } from '../../utils/luxon'

// simulate release on the next day
const releaseTime = toUnixTimestamp(getTomorrow())

export default [releaseTime]
