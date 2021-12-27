import { toTokenAmount } from '../support/all.helpers'
import { maxSupplyTokenAmount } from '../support/ShieldToken.helpers'
import { airdropRate, airdropStageShareDenominator, airdropStageShareNumerator } from '../support/BullToken.helpers'

export const expectations = {
  equalBalances: [
    "0x7dcbefb3b9a12b58af8759e0eb8df05656db911d",
  ],
  balances: {
    "0xc77aab3c6d7dab46248f3cc3033c856171878bd5": toTokenAmount("0"),
  },
  totalSHLDAmount: {
    min: maxSupplyTokenAmount.mul(3),
    max: maxSupplyTokenAmount.mul(5),
  },
  totalBULLAmount: {
    min: maxSupplyTokenAmount.mul(airdropRate).mul(airdropStageShareNumerator).div(airdropStageShareDenominator),
    max: maxSupplyTokenAmount.mul(airdropRate),
  },
}
