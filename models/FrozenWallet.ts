import { z } from 'zod'
import { toUidFromSchema, Uid } from './Uid'
import { AddressSchema } from './Address'
import { AmountBNSchema } from './AmountBN'
import { DurationSchema } from './Duration'
import { getDuplicatesRefinement } from '../util/zod'

export const FrozenWalletSchema = z.object({
  wallet: AddressSchema,
  totalAmount: AmountBNSchema,
  monthlyAmount: AmountBNSchema,
  initialAmount: AmountBNSchema,
  lockDaysPeriod: DurationSchema,
})

export const FrozenWalletsSchema = z.array(FrozenWalletSchema).superRefine(getDuplicatesRefinement('FrozenWallet', getFrozenWalletUid))

export const FrozenWalletUidSchema = FrozenWalletSchema.pick({
  wallet: true,
})

export type FrozenWallet = z.infer<typeof FrozenWalletSchema>

export type FrozenWalletUid = z.infer<typeof FrozenWalletUidSchema>

export const RawFrozenWalletSchema = FrozenWalletSchema.extend({
  totalAmount: z.string().min(1),
  monthlyAmount: z.string().min(1),
  initialAmount: z.string().min(1),
})

export type RawFrozenWallet = z.infer<typeof RawFrozenWalletSchema>

export function getFrozenWalletUid(walletUid: FrozenWalletUid): Uid {
  return toUidFromSchema(walletUid, FrozenWalletUidSchema)
}

export function validateFrozenWallet(wallet: FrozenWallet): FrozenWallet {
  return FrozenWalletSchema.parse(wallet)
}

export function validateFrozenWallets(wallets: FrozenWallet[]): FrozenWallet[] {
  return FrozenWalletsSchema.parse(wallets)
}

export function validateRawFrozenWallets(wallets: RawFrozenWallet[]) {
  const $wallets = wallets.map<FrozenWallet>(w => ({
    ...w,
    totalAmount: AmountBNSchema.parse(w.totalAmount),
    monthlyAmount: AmountBNSchema.parse(w.monthlyAmount),
    initialAmount: AmountBNSchema.parse(w.initialAmount),
  }))
  return validateFrozenWallets($wallets)
}
