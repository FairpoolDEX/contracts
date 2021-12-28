import { demandIntegerEnvVar } from './env'
import { gwei } from '../test/support/all.helpers'
import { strict as assert } from 'assert'
import { NetworkName } from './network'
import { impl } from './todo'

if (process.env.FEES) {
  const fees = process.env.FEES.split(':')
  process.env.MAX_FEE = fees[0]
  process.env.MAX_PRIORITY_FEE = fees[1]
}

export const maxFeePerGas = demandIntegerEnvVar('MAX_FEE', 'gwei') * gwei

export const maxPriorityFeePerGas = demandIntegerEnvVar('MAX_PRIORITY_FEE', 'gwei') * gwei

assert(maxFeePerGas >= maxPriorityFeePerGas)

export function getGasLimit(network: NetworkName) {
  console.log('network', network)
  switch (network) {
    case 'bscmainnet':
    case 'bsctestnet':
      return 8000000
    default:
      throw impl()
  }
}
