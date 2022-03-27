import { NetworkName } from '../models/NetworkName'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ensure } from './ensure'
import { CLIArgumentType } from 'hardhat/types/runtime'
import { ERRORS } from 'hardhat/internal/core/errors-list'
import { HardhatError } from 'hardhat/internal/core/errors'
import { Timestamp } from './types'

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
  parse(argName: string, strValue: string): Timestamp {
    const parseAsTimestampResult = parseInt(strValue, 10)
    if (parseAsTimestampResult.toString() === strValue) {
      return parseAsTimestampResult
    } else {
      return new Date(strValue).getTime()
    }
  },
}
