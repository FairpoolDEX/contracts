import { Contract } from 'ethers'
import { FrozenWallet, validateFrozenWallet } from '../FrozenWallet'
import { expect } from '../../util-local/expect'

export async function expectFrozenWalletsOnToken(token: Contract, expectedWallets: FrozenWallet[]) {
  return Promise.all(expectedWallets.map(wallet => expectFrozenWalletOnToken(token, wallet)))
}

export async function expectFrozenWalletOnToken(token: Contract, expectedWallet: FrozenWallet) {
  const actualWallet = validateFrozenWallet(await token.frozenWallets(expectedWallet.wallet))
  expect(expectedWallet).to.deep.equal(actualWallet)
}
