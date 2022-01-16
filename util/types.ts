import { ethers } from 'ethers'
import { HardhatEthersHelpers } from '@nomiclabs/hardhat-ethers/types'

export type AmountNum = number

export type PriceNum = number

export type AmountNumPair = [AmountNum, AmountNum]

export type Timestamp = number

export type Ethers = typeof ethers & HardhatEthersHelpers

export interface StringAllocation {
  [address: string]: string
}

export interface StringAllocations {
  [id: string]: StringAllocation
}
