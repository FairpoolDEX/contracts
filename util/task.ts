import { TaskArguments } from 'hardhat/types'
import { RunId } from './run'

export interface ShieldTaskArguments extends TaskArguments {
  runId: RunId
  dry: boolean
}

export interface Chunkable {
  chunkSize: number
}

export interface ChunkedShieldTaskArguments extends ShieldTaskArguments, Chunkable {}
