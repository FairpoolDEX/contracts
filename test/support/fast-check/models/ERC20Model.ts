import { Address } from '../../../../models/Address'
import { ensure } from '../../../../util/ensure'
import { zero } from '../../../../util/bignumber'
import { BalanceBN } from '../../../../models/BalanceBN'

export interface ERC20Model {
  address: Address
  balances: BalanceBN[]
}

export function findBalance(model: ERC20Model, address: Address) {
  return model.balances.find(b => b.address === address)
}

export function ensureBalance(model: ERC20Model, address: Address) {
  return ensure(findBalance(model, address))
}

export function findBalanceDefault(model: ERC20Model, address: Address) {
  return findBalance(model, address) || { address, amount: zero }
}

export function upsertBalance(model: ERC20Model, balanceNew: BalanceBN) {
  const balanceOld = findBalance(model, balanceNew.address)
  if (balanceOld) {
    Object.assign(balanceOld, balanceNew)
  } else {
    model.balances.push(balanceNew)
  }
}

export function getHolders(model: ERC20Model) {
  return model.balances.map(b => b.address)
}
