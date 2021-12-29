import { z } from 'zod'

export const AddressTypeSchema = z.enum([
  'Human',
  'NFTrade',
  'UniswapV2',
  'UniswapV3',
])

export type AddressType = z.infer<typeof AddressTypeSchema>

export const AddressInfoSchema = z.object({
  address: z.string(),
  type: AddressTypeSchema,
})

export type AddressInfo = z.infer<typeof AddressInfoSchema>

export function validateAddressInfo(info: AddressInfo) {
  return AddressInfoSchema.parse(info)
}

export function getAddressInfoUid(info: AddressInfo): string {
  return info.address
}
