import { getAddress as normalizeAddress } from 'ethers/lib/utils'
import { z } from 'zod'

export const AddressSchema = z.string().transform(normalizeAddress)

export type Address = z.infer<typeof AddressSchema>

export function validateAddress(address: Address) {
  return AddressSchema.parse(address)
}

export function validateAddresses(addresses: Address[]) {
  return addresses.map(validateAddress)
}

export function getAddressUid(address: Address): string {
  return address
}
