import { Overrides } from 'ethers'
import { maxFeePerGas, maxPriorityFeePerGas } from './gas'
import { BigNumber } from '@ethersproject/bignumber'
import { NetworkName } from '../models/NetworkName'

export interface NetworkInfo {
  name: NetworkName
}

// Copied from @ethersproject/abstract-provider because it had type errors
export interface FeeData {
  maxFeePerGas: null | BigNumber;
  maxPriorityFeePerGas: null | BigNumber;
  gasPrice: null | BigNumber;
}

export async function withFeeData(feeData: FeeData, overrides: Overrides = {}) {
  if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
    return Object.assign({}, { maxFeePerGas, maxPriorityFeePerGas }, overrides)
  } else {
    return Object.assign({}, { gasPrice: maxFeePerGas }, overrides)
  }
}
