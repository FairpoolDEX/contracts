import { Contract } from 'ethers'
import { BlockTag } from '@ethersproject/abstract-provider/src.ts/index'
import { Address } from '../Address'
import { expect } from '../../util-local/expect'
import { getERC20AmountsAtBlockTag } from '../../test/support/ERC20.helpers'

export async function expectBalancesAreEqual(token: Contract, from: BlockTag, to: BlockTag, addresses: Address[]) {
  const balancesBeforeAirdrop = await getERC20AmountsAtBlockTag(token, from, addresses)
  const balancesAfterRollback = await getERC20AmountsAtBlockTag(token, to, addresses)
  expect(balancesBeforeAirdrop).to.deep.equal(balancesAfterRollback)
}
