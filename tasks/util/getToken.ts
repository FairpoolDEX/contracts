import { Address } from '../../models/Address'
import { Ethers } from '../../util/types'
import { BullToken, ColiToken, GenericToken } from '../../typechain-types'

export async function getGenericToken(address: Address, ethers: Ethers) {
  return (await ethers.getContractAt('GenericToken', address)) as unknown as GenericToken
}

export async function getColiToken(address: Address, ethers: Ethers) {
  return (await ethers.getContractAt('ColiToken', address)) as unknown as ColiToken
}

export async function getBullToken(address: Address, ethers: Ethers) {
  return (await ethers.getContractAt('BullToken', address)) as unknown as BullToken
}
