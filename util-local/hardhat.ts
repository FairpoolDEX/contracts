import { NetworkName } from '../models/NetworkName'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ensure } from '../util/ensure'
import { CLIArgumentType } from 'hardhat/types/runtime'
import { ERRORS } from 'hardhat/internal/core/errors-list'
import { HardhatError } from 'hardhat/internal/core/errors'
import { Timestamp } from './types'
import { AmountBN } from '../models/AmountBN'
import { toTokenAmount } from '../test/support/all.helpers'
import { BigNumber } from 'ethers'

export const getProvider = (hre: HardhatRuntimeEnvironment) => async (networkName: NetworkName) => {
  const { ethers, config: { networks } } = hre
  const config = ensure(networks[networkName])
  if ('url' in config) {
    const provider = new ethers.providers.StaticJsonRpcProvider(config.url, config.chainId)
    await provider.ready
    return provider
  } else {
    throw new Error(`Cannot find config.url property for network "${networkName}"`)
  }
}

export const date: CLIArgumentType<Date> = {
  name: 'Date',
  validate: (name: string, value: unknown): void => {
    if (!(value instanceof Date)) {
      throw new HardhatError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, { value, name, type: date.name })
    }
  },
  parse(argName: string, strValue: string): Date {
    return new Date(strValue)
  },
}

export const timestamp: CLIArgumentType<Timestamp> = {
  name: 'timestamp',
  validate: (name: string, value: unknown): void => {
    if (typeof value !== 'number') {
      throw new HardhatError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, { value, name, type: timestamp.name })
    }
  },
  parse(argName: string, strValue: string) {
    const parseAsTimestampResult = parseInt(strValue, 10)
    if (parseAsTimestampResult.toString() === strValue) {
      return parseAsTimestampResult
    } else {
      return new Date(strValue).getTime()
    }
  },
}

export const amount: CLIArgumentType<AmountBN> = {
  name: 'amount',
  validate: (name: string, value: unknown): void => {
    if (!(value instanceof BigNumber)) {
      throw new HardhatError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, { value, name, type: amount.name })
    }
  },
  parse(argName: string, strValue: string) {
    const int = parseInt(strValue, 10)
    if (int.toString() !== strValue) throw new Error(`Cannot parse argument: ${argName}`)
    return toTokenAmount(int)
  },
}
