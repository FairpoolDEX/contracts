import { Address } from '../../../models/Address'
import { FairpoolTest } from '../../../typechain-types'
import { BigNumber } from 'ethers'

export type TransactionInfoArg = BigNumber | Address

export interface TransactionInfo {
  origin: string
  caller: Address
  name: Parameters<FairpoolTest['interface']['getFunction']>[0]
  args: TransactionInfoArg[]
  value: BigNumber
  timeDelay: BigNumber
  blockDelay: BigNumber
}
