import { identity } from 'lodash'
import { RunnableContext } from '../../util/context'
import { Chunkable } from '../../util/chunkable'
import { SetClaimsContext, SetClaimsTaskArguments } from '../../tasks/setClaimsTask'
import { airdropRate, airdropStageShareDenominator, airdropStageShareNumerator } from './BullToken.helpers'
import hardhatRuntimeEnvironment from 'hardhat'
import { RunnableTaskArguments } from '../../util/task'
import { WriteClaimsContext } from '../../tasks/writeClaimsTask'
import { tmpdir } from 'os'

export const testRunnableTaskArguments: RunnableTaskArguments = {
  cacheKey: '',
  dry: false,
}

export const testChunkableTaskArguments: Chunkable = {
  chunkSize: 325,
}

export const testRunnableContext: RunnableContext = {
  ...hardhatRuntimeEnvironment,
  ...testRunnableTaskArguments,
  networkName: 'hardhat',
  deployerAddress: '',
  log: identity,
  run: () => Promise.resolve(),
}

export const testChunkableContext: Chunkable = {
  ...testChunkableTaskArguments,
}

export const testSetClaimsTaskArguments: SetClaimsTaskArguments = {
  contractName: 'BullToken',
  contractAddress: '',
  claims: '',
  airdropStageShareNumerator,
  airdropStageShareDenominator,
  airdropRate,
  ...testRunnableTaskArguments,
  ...testChunkableTaskArguments,
}

export const testSetClaimsContext: SetClaimsContext = {
  ...testSetClaimsTaskArguments,
  ...testRunnableContext,
}

export const testWriteClaimsContext: WriteClaimsContext = {
  out: `${tmpdir()}/testWriteClaims.json`,
  expectations: '',
  ...testRunnableContext,
}
