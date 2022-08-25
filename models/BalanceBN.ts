import { z } from 'zod'
import { Address, AddressSchema } from './Address'
import { AmountBN, AmountBNSchema } from './AmountBN'
import { getDuplicatesRefinement } from '../util/zod'
import { toUidFromSchema, Uid } from './Uid'

export const BalanceBNSchema = z.object({
  address: AddressSchema,
  amount: AmountBNSchema,
})

export const BalancesBNSchema = z.array(BalanceBNSchema)
  .superRefine(getDuplicatesRefinement('BalanceBN', getBalanceBNUid))

export const BalanceBNUidSchema = BalanceBNSchema.pick({
  address: true,
})

export type BalanceBN = z.infer<typeof BalanceBNSchema>

export type BalanceBNUid = z.infer<typeof BalanceBNUidSchema>

export function validateBalanceBN(balance: BalanceBN): BalanceBN {
  if (balance.address === '') throw new Error(`${JSON.stringify(balance)}`)
  return BalanceBNSchema.parse(balance)
}

export function validateBalancesBN(balances: BalanceBN[]): BalanceBN[] {
  return BalancesBNSchema.parse(balances)
}

export function getBalanceBNUid(balanceUid: BalanceBNUid): Uid {
  return toUidFromSchema(balanceUid, BalanceBNUidSchema)
}

export function balanceBN(address: Address, amount: AmountBN): BalanceBN {
  return validateBalanceBN({ address, amount })
}
