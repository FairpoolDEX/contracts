import { identity } from 'lodash'
import { getRunnableContext, RunnableContext } from '../../util/context'
import { Chunkable } from '../../util/chunkable'
import { SetClaimsContext, SetClaimsTaskArguments } from '../../tasks/setClaimsTask'
import { airdropRate, airdropStageShareDenominator, airdropStageShareNumerator } from './BullToken.helpers'
import hardhatRuntimeEnvironment from 'hardhat'
import { RunnableTaskArguments } from '../../util/task'

export async function getTestRunnableTaskArguments(): Promise<RunnableTaskArguments> {
  return {
    cacheKey: '',
  }
}

export async function getTestRunnableContext<Args extends RunnableTaskArguments>(args: Args): Promise<RunnableContext & Args> {
  return {
    ...await getRunnableContext(args, hardhatRuntimeEnvironment),
    log: identity,
  }
}

export async function getTestChunkableTaskArguments(): Promise<Chunkable> {
  return {
    chunkSize: 325,
  }
}

export async function getTestChunkableContext(): Promise<Chunkable> {
  return {
    ...await getTestChunkableTaskArguments(),
  }
}

export async function getTestSetClaimsTaskArguments(): Promise<SetClaimsTaskArguments> {
  return {
    contractName: 'BullToken',
    contractAddress: '',
    claims: '',
    airdropStageShareNumerator,
    airdropStageShareDenominator,
    airdropRate,
    ...await getTestRunnableTaskArguments(),
    ...await getTestChunkableTaskArguments(),
    cacheKey: 'rebrand',
    chunkSize: 250,
  }
}

export async function getTestSetClaimsContext(): Promise<SetClaimsContext> {
  return getTestRunnableContext(await getTestSetClaimsTaskArguments())
}
