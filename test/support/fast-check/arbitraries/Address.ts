import { constantFrom, hexaString } from 'fast-check'
import { Address } from '../../../../models/Address'

export function addressFrom(addresses: Address[]) {
  return constantFrom(...addresses)
}

export function address() {
  return hexaString({ minLength: 40, maxLength: 40 }).map((hash) => '0x' + hash)
}
