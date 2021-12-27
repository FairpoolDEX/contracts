import { toTokenAmount } from '../support/all.helpers'
import { TransferManyExpectationsMap } from '../../tasks/transferManyTask'
import { BigNumber } from 'ethers'

export const expectations: TransferManyExpectationsMap = {
  balances: {
    "0xc77aab3c6d7dab46248f3cc3033c856171878bd5": toTokenAmount("0"), // locked liquidity
  },
  // https://etherscan.io/token/0x1Bb022aB668085C6417B7d7007b0fbD53bACc383#readProxyContract
  totalAmount: BigNumber.from("1490403967926689867814673435496"),
}
