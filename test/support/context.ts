import { identity } from 'lodash'
import { RunnableContext } from '../../util/context'
import { Chunkable } from '../../util/chunkable'
import { SetClaimsContext, SetClaimsTaskArguments } from '../../tasks/setClaimsTask'
import { airdropRate, airdropStageShareDenominator, airdropStageShareNumerator } from './BullToken.helpers'
import { ethers } from 'hardhat'
import { RunnableTaskArguments } from '../../util/task'

export const testRunnableTaskArguments: RunnableTaskArguments = {
  runId: '',
  dry: false,
}

export const testChunkableTaskArguments: Chunkable = {
  chunkSize: 325,
}

export const testRunnableContext: RunnableContext = {
  ...testRunnableTaskArguments,
  networkName: 'hardhat',
  deployerAddress: '',
  log: identity,
  ethers,
}

export const testChunkableContext: Chunkable = {
  ...testChunkableTaskArguments,
}

export const testSetClaimsTaskArguments: SetClaimsTaskArguments = {
  contractName: 'BullToken',
  contractAddress: '',
  claims: '',
  expectations: '',
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
