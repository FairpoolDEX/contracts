import { getAddress as normalizeAddress } from 'ethers/lib/utils'
import { z } from 'zod'

export type Address = string

export const AddressSchema = z.string().transform(normalizeAddress)

export function validateAddress(address: Address) {
  return AddressSchema.parse(address)
}

export function getAddressUid(address: Address): string {
  return address
}
