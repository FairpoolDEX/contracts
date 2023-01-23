import { z } from 'zod'
import { getDuplicatesRefinement } from '../utils/zod'
import { AddressSchema } from './Address'

export const AddressableSchema = z.object({
  address: AddressSchema,
})

export const AddressablesSchema = z.array(AddressableSchema)
  .superRefine(getDuplicatesRefinement('Addressable', parseAddressableUid))

export const AddressableUidSchema = AddressableSchema.pick({
  address: true,
})

export type Addressable = z.infer<typeof AddressableSchema>

export type AddressableUid = z.infer<typeof AddressableUidSchema>

export function parseAddressable(addressable: Addressable): Addressable {
  return AddressableSchema.parse(addressable)
}

export function parseAddressables(addressables: Addressable[]): Addressable[] {
  return AddressablesSchema.parse(addressables)
}

export function parseAddressableUid(addressableUid: AddressableUid): AddressableUid {
  return AddressableUidSchema.parse(addressableUid)
}
