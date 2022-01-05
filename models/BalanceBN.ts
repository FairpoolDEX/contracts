import { z } from 'zod'
import { Address, AddressSchema } from './Address'
import { BigNumber } from 'ethers'
import { AmountBN, AmountBNSchema } from './AmountBN'

export const BalanceBNSchema = z.object({
  address: AddressSchema,
  amount: z.preprocess((arg: unknown) => BigNumber.from(arg), AmountBNSchema),
})

export type BalanceBN = z.infer<typeof BalanceBNSchema>

export function validateBalanceBN(balance: BalanceBN) {
  return BalanceBNSchema.parse(balance)
}

export function balanceBN(address: Address, amount: AmountBN): BalanceBN {
  return validateBalanceBN({ address, amount })
}
