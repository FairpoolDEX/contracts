import { z } from 'zod'
import { getDuplicatesRefinement } from '../util/zod'
import { isEqualBy } from '../util/lodash'
import { NetworkNameSchema } from './NetworkName'
import { AddressSchema } from './Address'

export const RawAddressInfoSchema = z.object({
  name: z.string(),
  network: NetworkNameSchema,
  address: AddressSchema,
}).describe('RawAddressInfo')

export const RawAddressInfosSchema = z.array(RawAddressInfoSchema)
  .superRefine(getDuplicatesRefinement('RawAddressInfo', parseRawAddressInfoUid))

export const RawAddressInfoUidSchema = RawAddressInfoSchema.pick({
  name: true,
  network: true,
})

export type RawAddressInfo = z.infer<typeof RawAddressInfoSchema>

export type RawAddressInfoUid = z.infer<typeof RawAddressInfoUidSchema>

export function parseRawAddressInfo(info: RawAddressInfo): RawAddressInfo {
  return RawAddressInfoSchema.parse(info)
}

export function parseRawAddressInfos(infos: RawAddressInfo[]): RawAddressInfo[] {
  return RawAddressInfosSchema.parse(infos)
}

export function parseRawAddressInfoUid(infoUid: RawAddressInfoUid): RawAddressInfoUid {
  return RawAddressInfoUidSchema.parse(infoUid)
}

export const isEqualRawAddressInfo = (a: RawAddressInfo) => (b: RawAddressInfo) => isEqualBy(a, b, parseRawAddressInfoUid)
