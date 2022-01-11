import { z } from 'zod'
import { NetworkName, NetworkNameSchema } from './NetworkName'
import { Address, AddressSchema } from './Address'
import { AddressTypeSchema } from './AddressType'

export const AddressInfoSchema = z.object({
  network: NetworkNameSchema,
  address: AddressSchema,
  type: AddressTypeSchema,
})

export type AddressInfo = z.infer<typeof AddressInfoSchema>

export function validateAddressInfo(info: AddressInfo) {
  return AddressInfoSchema.parse(info)
}

export function getAddressInfoUid(info: Pick<AddressInfo, 'network' | 'address'>): string {
  return toAddressInfoUid(info.network, info.address)
}

export function toAddressInfoUid(network: NetworkName, address: Address) {
  return `${network}:${address}`
}
