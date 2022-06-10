import { getVestingScheduleUid, VestingSchedule, VestingScheduleSchema } from '../models/VestingSchedule'
import { getFinder, getInserter } from '../util/zod'
import { HundredPercent } from '../models/SmartContractPercentage'
import { VestingName } from '../models/VestingName.js'
import { getReleasePeriodsElapsed } from '../test/support/ColiToken.helpers'
import { ensure } from '../util/ensure'

export const allVestingSchedules: VestingSchedule[] = []

export const addVestingSchedule = getInserter('VestingSchedule', VestingScheduleSchema, getVestingScheduleUid, allVestingSchedules)

export const findVestingSchedule = getFinder(getVestingScheduleUid, allVestingSchedules)

addVestingSchedule({
  type: 'Seed',
  smartContractIndex: 0,
})

addVestingSchedule({
  type: 'Private',
  smartContractIndex: 1,
})

addVestingSchedule({
  type: 'Public',
  initialUnlock: HundredPercent,
})

addVestingSchedule({
  type: 'Advisory',
  smartContractIndex: 2,
})

addVestingSchedule({
  type: 'Team',
  smartContractIndex: 3,
})

addVestingSchedule({
  type: 'Development',
  smartContractIndex: 4,
})

addVestingSchedule({
  type: 'Marketing',
  smartContractIndex: 5,
})

addVestingSchedule({
  type: 'General Reserve',
  smartContractIndex: 7,
})

addVestingSchedule({
  type: 'Liquidity provisioning',
  initialUnlock: HundredPercent,
})

addVestingSchedule({
  type: 'Liquidity mining',
  initialUnlock: HundredPercent,
})

addVestingSchedule({
  type: 'Rewards',
  initialUnlock: HundredPercent,
})

function getPartial<Key, Value>(map: Map<Key, Value>, key: Key) {
  return ensure(map.get(key))
}

export function getFinishedVestingTypes() {
  const periods = getReleasePeriodsElapsed(new Date())
  const map = new Map<number, VestingName[]>([
    [8, withDefaultFinishedVestingTypes(['Private'])],
  ])
  return getPartial(map, periods)
}

export function withDefaultFinishedVestingTypes(types: VestingName[]): VestingName[] {
  return getDefaultFinishedVestingTypes().concat(types)
}

export function getDefaultFinishedVestingTypes(): VestingName[] {
  return allVestingSchedules.filter(s => s.initialUnlock?.eq(HundredPercent)).map(s => s.type)
}
