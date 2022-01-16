import { Contract } from 'ethers'
import { BlockTag } from '@ethersproject/abstract-provider/src.ts/index'
import { Address } from '../../models/Address'
import { AmountBN } from '../../models/AmountBN'
import { BalanceBN, validateBalanceBN } from '../../models/BalanceBN'

export async function getERC20AmountsAtBlockTag(token: Contract, blockTag: BlockTag, addresses: Address[]): Promise<AmountBN[]> {
  return Promise.all(addresses.map((address) => token.balanceOf(address, { blockTag })))
}

export async function getERC20Balances(token: Contract, addresses: Address[]): Promise<BalanceBN[]> {
  return Promise.all(addresses.map(async (address) => await getERC20Balance(token, address)))
}

export async function getERC20Balance(token: Contract, address: Address) {
  return validateBalanceBN({
    address,
    amount: await token.balanceOf(address),
  })
}
