import { BN } from '../../libs/bn'
import { QuoteScale, ShareScale } from '../../libs/fairpool/constants'
import { bn, maxBN } from '../../libs/bn/utils'
import { Fairpool } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { buy, selloff } from './Fairpool.functions'
import { show } from '../../libs/utils/debug'
import { expect } from '../../utils-local/expect'

/**
 * @deprecated Used for previous version of the bonding curve formula
 */
export function getQuoteAmountMin(speed: BN, scale: BN) {
  return speed.mul(scale)
}

export const quoteDeltaMinStatic = ShareScale.mul(2)

export const getQuoteDeltaMinExperimental = (amountStart: BN, amountMin: BN, amountMax: BN, deltaMax: BN) => async (fairpool: Fairpool, bob: SignerWithAddress) => {
  let amountNew = amountStart
  let amountOld = amountMin
  const multiplier = bn(2)
  while (amountOld.lt(amountMax)) {
    try {
      show('amountNew', 'amountOld', amountNew, amountOld)
      await buy(fairpool, bob, amountNew)
      await selloff(fairpool, bob)
      const delta = amountNew.sub(amountOld)
      if (delta.lt(deltaMax)) {
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
  const amountMin = ShareScale.mul(2)
  const amountMax = QuoteScale.mul(100)
  const amountStart = amountMin
  const maxDelta = bn(2)
  const quoteDeltaMin1 = await getQuoteDeltaMinExperimental(amountStart, amountMin, amountMax, maxDelta)(fairpool, bob)
  show('quoteDeltaMin1', quoteDeltaMin1)
  await buy(fairpool, sam, QuoteScale.mul(10))
  const quoteDeltaMin2 = await getQuoteDeltaMinExperimental(amountStart, amountMin, amountMax, maxDelta)(fairpool, bob)
  show('quoteDeltaMin2', quoteDeltaMin2)
  expect(quoteDeltaMin1).to.be.lte(quoteDeltaMin2)
  const quoteDeltaMinMax = QuoteScale.div(1000) // 0.001 ETH
  expect(quoteDeltaMin1).to.be.lt(quoteDeltaMinMax)
  expect(quoteDeltaMin2).to.be.lt(quoteDeltaMinMax)
}
