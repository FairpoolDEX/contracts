import { Ethers } from './types'
import { Address } from '../models/Address'
import { BlockTag } from '@ethersproject/abstract-provider/src.ts/index'
import { Provider } from '@ethersproject/providers'
import { RateLimiter } from 'limiter'
import { impl } from '../util/todo'
import { Contract, Signer } from 'ethers'
import { getCacheKey } from '../util/cache'
import { Cache } from 'cache-manager'
import { validateContractCode } from '../models/ContractCode'
import { rateLimiter } from './getblock'
import { debug } from '../util/debug'
import { RunnableContext } from './context/getRunnableContext'
import { seqMap } from '../util/promise'
import { ContractTransaction } from '@ethersproject/contracts'
import { getTransactionUrl } from '../util/url'

export async function getCode(ethers: Ethers, address: Address) {
  await rateLimiter.removeTokens(1)
  debug(__filename, getCode, address)
  return ethers.provider.getCode(address)
}

export async function getCodeCached(ethers: Ethers, cache: Cache, address: Address) {
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

export async function getContractForSigner(ethers: Ethers, contractName: string, contractAddress: Address, signer: Signer): Promise<Contract> {
  const contract = await getContract(ethers, contractName, contractAddress)
  return contract.connect(signer)
}

/**
 * It's necessary to send transactions sequentially, otherwise ethers.js uses the same nonce for all of them
 */
export function sendMultipleTransactions<In, Out extends ContractTransaction, Args extends unknown[]>(context: RunnableContext, values: In[], mapper: (value: In, ...args: Args) => Promise<Out>, ...args: Args) {
  const { log, signer } = context
  return seqMap(values, async (value: In, ...args: Args) => {
    const tx = await mapper(value, ...args)
    log(await getTransactionUrl(tx, signer))
    await tx.wait(1)
    return tx
  }, ...args)
}
