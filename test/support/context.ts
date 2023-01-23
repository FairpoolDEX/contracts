import { identity } from 'lodash'
import { getRunnableContext, RunnableContext } from '../../utils-local/context/getRunnableContext'
import { SetClaimsContext, SetClaimsTaskArguments } from '../../tasks/setClaimsTask'
import { airdropRate, airdropStageShareDenominator, airdropStageShareNumerator } from './BullToken.helpers'
import hardhatRuntimeEnvironment from 'hardhat'
import { RunnableTaskArguments } from '../../utils-local/RunnableTaskArguments'
import { Chunked } from '../../utils-local/context/getChunkedContext'

export async function getTestRunnableTaskArguments(): Promise<RunnableTaskArguments> {
  return {}
}

export async function getTestRunnableContext<Args extends RunnableTaskArguments>(args: Args): Promise<RunnableContext & Args> {
  return {
    ...await getRunnableContext(args, hardhatRuntimeEnvironment),
    log: identity,
  }
}

export async function getTestChunkableTaskArguments(): Promise<Chunked> {
  return {
    chunkSize: 325,
  }
}

export async function getTestChunkableContext(): Promise<Chunked> {
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
    chunkSize: 250,
  }
}

export async function getTestSetClaimsContext(): Promise<SetClaimsContext> {
  return getTestRunnableContext(await getTestSetClaimsTaskArguments())
}
