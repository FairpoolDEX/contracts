import { Overrides } from "ethers"
import { maxFeePerGas, maxPriorityFeePerGas } from "./gas"
import { BigNumber } from "@ethersproject/bignumber"

export interface NetworkInfo {
  name: string
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
