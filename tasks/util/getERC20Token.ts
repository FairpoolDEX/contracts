import { Address } from '../../models/Address'
import { Ethers } from '../../util-local/types'
import { BullToken, ColiToken, GenericToken, GenericTokenWithVesting } from '../../typechain-types'
import { NetworkName } from '../../libs/ethereum/models/NetworkName'
import { ensure } from '../../util/ensure'
import { findDeployment } from '../../data/allDeployments'

export async function getGenericToken(address: Address, ethers: Ethers) {
  return (await ethers.getContractAt('GenericToken', address)) as unknown as GenericToken
}

export async function getGenericTokenWithVesting(address: Address, ethers: Ethers) {
  return (await ethers.getContractAt('GenericTokenWithVesting', address)) as unknown as GenericTokenWithVesting
}

export async function getColiToken(address: Address, ethers: Ethers) {
  return (await ethers.getContractAt('ColiToken', address)) as unknown as ColiToken
}

export async function getBullToken(address: Address, ethers: Ethers) {
  return (await ethers.getContractAt('BullToken', address)) as unknown as BullToken
}

export async function getBullTokenFromDeployment(networkName: NetworkName, ethers: Ethers) {
  const deployment = ensure(findDeployment({ contract: 'BullToken', network: networkName }))
  return getBullToken(deployment.address, ethers)
}
