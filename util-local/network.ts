import { Overrides } from 'ethers'
import { getGasLimit, maxFeePerGas, maxPriorityFeePerGas } from './gas'
import { BigNumber } from '@ethersproject/bignumber'
import { NetworkName } from '../models/NetworkName'
import { Signer } from '@ethersproject/abstract-signer/src.ts/index'
import { ensure } from '../util/ensure'
import { findNetworkByChainId } from '../data/allNetworks'

export interface NetworkInfo {
  name: NetworkName
}

// Copied from @ethersproject/abstract-provider because it had type errors
export interface FeeData {
  maxFeePerGas: null | BigNumber;
  maxPriorityFeePerGas: null | BigNumber;
  gasPrice: null | BigNumber;
}

export async function getFeeOverrides(signer: Signer): Promise<Pick<Overrides, 'maxFeePerGas' | 'maxPriorityFeePerGas' | 'gasPrice'>> {
  const feeData = await signer.getFeeData()
  if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
    return { maxFeePerGas, maxPriorityFeePerGas }
  } else {
    return { gasPrice: maxFeePerGas }
  }
}

export async function getOverrides(signer: Signer): Promise<Overrides> {
  const feeOverrides = await getFeeOverrides(signer)
  const network = await getNetworkFromSigner(signer)
  const gasLimit = getGasLimit(network.name)
  return { ...feeOverrides, gasLimit }
}

export async function getNetworkFromSigner(signer: Signer) {
  const provider = ensure(signer.provider)
  const network = await provider.getNetwork()
  return ensure(findNetworkByChainId(network.chainId))
}
