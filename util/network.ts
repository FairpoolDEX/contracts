import { Overrides } from 'ethers'
import { maxFeePerGas, maxPriorityFeePerGas } from './gas'
import { BigNumber } from '@ethersproject/bignumber'

export type NetworkName = 'mainnet' | 'ropsten' | 'bsctestnet' | 'bscmainnet' | 'avaxtestnet' | 'avaxmainnet'

export interface NetworkInfo {
  name: NetworkName
}

// Copied from @ethersproject/abstract-provider because it had type errors
export interface FeeData {
  maxFeePerGas: null | BigNumber;
  maxPriorityFeePerGas: null | BigNumber;
  gasPrice: null | BigNumber;
}

export async function withFeeData(feeData: FeeData, overrides: Overrides) {
  if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
    Object.assign(overrides, { maxFeePerGas, maxPriorityFeePerGas })
  } else {
    Object.assign(overrides, { gasPrice: maxFeePerGas })
  }
  return overrides
}