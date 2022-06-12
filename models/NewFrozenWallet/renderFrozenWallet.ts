import { NewFrozenWallet } from '../NewFrozenWallet'

export function renderNewFrozenWallet(w: NewFrozenWallet) {
  return {
    wallet: w.wallet,
    totalAmount: w.totalAmount.toString(),
    initialAmount: w.initialAmount.toString(),
    dailyAmount: w.dailyAmount.toString(),
    monthlyAmount: w.monthlyAmount.toString(),
    lockDaysPeriod: w.lockDaysPeriod.toString(),
  }
}
