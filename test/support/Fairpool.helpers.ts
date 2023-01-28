import { BN } from '../../libs/bn'
import { DefaultQuoteBuffer, WeightScale } from '../../libs/fairpool/constants'
import { bn, getShare as getShareOriginal, maxBN } from '../../libs/bn/utils'
import { BigNumberish } from 'ethers'
import { Fairpool } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { buy, sell } from './Fairpool.functions'
import { show } from '../../libs/utils/debug'
import { QuoteScale } from '../../libs/fairpool/constants.all'
import { expect } from '../../utils-local/expect'

export function getWeightedPercent(numerator: BigNumberish, denominator: BigNumberish = 100) {
  return getShareOriginal(WeightScale, numerator, denominator)
}

/**
 * @deprecated Used for previous version of the bonding curve formula
 */
export function getQuoteAmountMin(speed: BN, scale: BN) {
  return speed.mul(scale)
}

export const quoteDeltaMinStatic = bn('40') // static value generated with ensureQuoteDeltaMin

export const getQuoteDeltaMinExperimental = (from: BN, to: BN, maxDelta: BN) => async (fairpool: Fairpool, bob: SignerWithAddress) => {
  let amountNew = bn(10)
  let amountOld = bn(0)
  const multiplier = bn(2)
  while (amountOld.lt(to)) {
    try {
      console.log('try', amountNew, amountOld)
      await buy(fairpool, bob, amountNew)
      const balance = await fairpool.balanceOf(bob.address)
      await sell(fairpool, bob, balance)
      const delta = amountNew.sub(amountOld)
      if (delta.lt(maxDelta)) {
        return maxBN(amountOld, amountNew)
      }
      amountNew = amountOld.add(delta.div(2))
    } catch (e) {
      if (e instanceof Error && e.message.includes('BaseDeltaMustBeGreaterThanZero')) {
        amountOld = amountNew
        amountNew = amountNew.mul(multiplier)
        continue
      }
      throw e
    }
  }
  throw new Error('Could not find the amount')
}

export async function ensureQuoteDeltaMin(fairpool: Fairpool, bob: SignerWithAddress, sam: SignerWithAddress) {
  const from = bn(1000000000000)
  const to = DefaultQuoteBuffer
  const maxDelta = bn(1000000)
  const quoteDeltaMin1 = await getQuoteDeltaMinExperimental(from, to, maxDelta)(fairpool, bob)
  show(quoteDeltaMin1)
  await buy(fairpool, sam, QuoteScale.mul(10))
  const quoteDeltaMin2 = await getQuoteDeltaMinExperimental(from, to, maxDelta)(fairpool, bob)
  show(quoteDeltaMin2)
  expect(quoteDeltaMin1).to.be.lt(quoteDeltaMin2)
  const quoteDeltaMinMax = QuoteScale.div(1000) // 0.001 ETH
  expect(quoteDeltaMin1).to.be.lt(quoteDeltaMinMax)
  expect(quoteDeltaMin2).to.be.lt(quoteDeltaMinMax)
}
