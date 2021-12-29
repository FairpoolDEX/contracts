import { z } from 'zod'
import { NetworkName, NetworkNameSchema } from './Network'
import { Address, AddressSchema } from './Address'

export const AddressTypeSchema = z.enum([
  'Human',
  'NFTrade',
  'UniswapV2',
  'UniswapV3',
  'TeamFinanceLiquidityLocker',
])

export type AddressType = z.infer<typeof AddressTypeSchema>

export const AddressInfoSchema = z.object({
  network: NetworkNameSchema,
  address: AddressSchema,
  type: AddressTypeSchema,
})

export type AddressInfo = z.infer<typeof AddressInfoSchema>

export function validateAddressInfo(info: AddressInfo) {
  return AddressInfoSchema.parse(info)
}

export function getAddressInfoUid(info: AddressInfo): string {
  return toAddressInfoUid(info.network, info.address)
}

export function toAddressInfoUid(network: NetworkName, address: Address) {
  return `${network}:${address}`
}
