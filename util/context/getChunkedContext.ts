import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { pick } from 'lodash'

export interface Chunked {
  chunkSize: number
}

export async function getChunkedContext(args: Chunked, hre: HardhatRuntimeEnvironment): Promise<Chunked> {
  return pick(args, 'chunkSize')
}
