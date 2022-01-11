import { Address } from '../../models/Address'
import { Ethers } from '../../util/types'
import { BullToken, GenericToken, ShieldToken } from '../../typechain-types'

export async function getGenericToken(address: Address, ethers: Ethers) {
  return (await ethers.getContractAt('GenericToken', address)) as unknown as GenericToken
}

export async function getShieldToken(address: Address, ethers: Ethers) {
  return (await ethers.getContractAt('ShieldToken', address)) as unknown as ShieldToken
}

export async function getBullToken(address: Address, ethers: Ethers) {
  return (await ethers.getContractAt('BullToken', address)) as unknown as BullToken
}
