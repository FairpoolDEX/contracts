import { identity } from 'lodash'
import { RunnableContext } from '../../util/context'
import { Chunkable } from '../../util/chunkable'
import { SetClaimsContext } from '../../tasks/setClaimsTask'

export const testRunnableContext: RunnableContext = {
  runId: '',
  networkName: 'hardhat',
  deployerAddress: '',
  dry: false,
  log: identity,
}

export const testChunkableContext: Chunkable = {
  chunkSize: 325,
}

export const testSetClaimsContext: SetClaimsContext = {
  ...testRunnableContext,
  ...testChunkableContext,
}
