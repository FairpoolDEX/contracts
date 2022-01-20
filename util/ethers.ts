import { Ethers } from './types'
import { Address } from '../models/Address'
import { BlockTag } from '@ethersproject/abstract-provider/src.ts/index'
import { Provider } from '@ethersproject/providers'
import { RateLimiter } from 'limiter'
import { impl } from './todo'
import { Contract } from 'ethers'
import { getCacheKey } from './cache'
import { Cache } from 'cache-manager'
import { validateContractCode } from '../models/ContractCode'
import { debug } from './debug'

export async function getCode(ethers: Ethers, address: Address) {
  await removeTokens(ethers.provider, 1)
  return ethers.provider.getCode(address)
}

export async function getCodeCached(ethers: Ethers, cache: Cache, address: Address) {
  debug(__filename, getCodeCached, address)
  const cacheKey = getCacheKey(getCodeCached, address)
  const code = await cache.wrap<string>(cacheKey, () => getCode(ethers, address))
  return validateContractCode(code)
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

export async function getContract(ethers: Ethers, contractName: string, contractAddress: Address): Promise<Contract> {
  const token = await ethers.getContractFactory(contractName)
  return token.attach(contractAddress)
}
