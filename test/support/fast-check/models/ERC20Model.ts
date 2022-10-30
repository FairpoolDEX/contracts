import { Address } from '../../../../models/Address'
import { ensure } from '../../../../util/ensure'
import { BalanceBN } from '../../../../models/BalanceBN'
import { removeByIndex } from '../../../../util/lodash'
import { zero } from '../../../../libs/bn/constants'

export interface ERC20Model {
  address: Address
  balances: BalanceBN[]
}

export function findBalance(model: ERC20Model, address: Address) {
  return model.balances.find(b => b.address === address)
}

export function findBalanceIndex(model: ERC20Model, address: Address) {
  return model.balances.findIndex(b => b.address === address)
}

export function ensureBalance(model: ERC20Model, address: Address) {
  return ensure(findBalance(model, address))
}

export function findBalanceDefault(model: ERC20Model, address: Address) {
  return findBalance(model, address) || { address, amount: zero }
}

export function upsertBalance(model: ERC20Model, balanceNew: BalanceBN) {
  const balanceOldIndex = findBalanceIndex(model, balanceNew.address)
  const balanceOld = model.balances[balanceOldIndex]
  if (balanceOld) {
    if (balanceNew.amount.isZero()) {
      model.balances = removeByIndex(model.balances, balanceOldIndex)
    } else {
      Object.assign(balanceOld, balanceNew)
    }
  } else {
    model.balances.push(balanceNew)
  }
}

export function getHolders(model: ERC20Model) {
  return model.balances.map(b => b.address)
}
