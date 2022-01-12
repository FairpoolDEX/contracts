import { Ethers } from './types'
import { Address } from '../models/Address'
import { BlockTag } from '@ethersproject/abstract-provider/src.ts/index'
import { Provider } from '@ethersproject/providers'
import { RateLimiter } from 'limiter'
import { impl } from './todo'

export async function getCode(ethers: Ethers, address: Address) {
  await removeTokens(ethers.provider, 1)
  return ethers.provider.getCode(address)
}

export async function getRateLimiter(provider: Provider): Promise<RateLimiter> {
  const network = await provider.getNetwork()
  throw impl()
  // if (provider.has)
  // switch (true) {
  //   case provider instanceof UrlJsonRpcProvider
  // }
}

export async function removeTokens(provider: Provider, num: number) {
  return (await getRateLimiter(provider)).removeTokens(1)
}

export async function getBlockNumber(provider: Provider, tag: BlockTag) {
  return isBlockNumber(tag) ? tag : (await provider.getBlock(tag)).number
}

function isBlockNumber(tag: BlockTag): tag is number {
  return typeof tag === 'number'
}
