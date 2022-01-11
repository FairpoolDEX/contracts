import { Ethers } from './types'
import { Address } from '../models/Address'
import { rateLimiter } from './infura'

export async function getCode(ethers: Ethers, address: Address) {
  await rateLimiter.removeTokens(1)
  return await ethers.provider.getCode(address)
}
