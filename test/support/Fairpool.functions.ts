import { Fairpool } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'
import { MaxUint256 } from '../../libs/ethereum/constants'
import { bn } from '../../libs/bn/utils'
import { BN } from '../../libs/bn'

export async function buy(fairpool: Fairpool, signer: SignerWithAddress, quoteDeltaProposed: BigNumber) {
  return fairpool.connect(signer).buy(0, MaxUint256, { value: quoteDeltaProposed })
}

export async function sell(fairpool: Fairpool, signer: SignerWithAddress, baseDeltaProposed: BigNumber) {
  return fairpool.connect(signer).sell(baseDeltaProposed, 0, MaxUint256)
}

export async function selloff(fairpool: Fairpool, signer: SignerWithAddress) {
  const fullBalance = await fairpool.balanceOf(signer.address)
  await sell(fairpool, signer, fullBalance)
}

export async function cycleBuySell(fairpool: Fairpool, signer: SignerWithAddress, quoteDeltaProposed: BigNumber) {
  const balanceBefore = await fairpool.balanceOf(signer.address)
  await buy(fairpool, signer, quoteDeltaProposed)
  const balanceAfter = await fairpool.balanceOf(signer.address)
  await sell(fairpool, signer, balanceAfter.sub(balanceBefore))
}

export async function cycleBuySelloff(fairpool: Fairpool, signer: SignerWithAddress, quoteDeltaProposed: BigNumber) {
  await buy(fairpool, signer, quoteDeltaProposed)
  await selloff(fairpool, signer)
}

export async function getBalances(fairpool: Fairpool, signer: SignerWithAddress) {
  return {
    base: await fairpool.balanceOf(signer.address),
    quote: await signer.getBalance(),
  }
}

export interface SupplyStats {
  baseSupply: BN
  quoteSupply: BN
}

export async function getSupplyStats(fairpool: Fairpool): Promise<SupplyStats> {
  return {
    baseSupply: await fairpool.totalSupply(),
    quoteSupply: await fairpool.quoteBalanceOfContract(),
  }
}

export function subSupplyStats(a: SupplyStats, b: SupplyStats): SupplyStats {
  return {
    baseSupply: a.baseSupply.sub(b.baseSupply),
    quoteSupply: a.quoteSupply.sub(b.quoteSupply),
  }
}

export const zeroSupplyStats = { baseSupply: bn(0), quoteSupply: bn(0) }
