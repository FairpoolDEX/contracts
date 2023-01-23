import { Address } from '../../models/Address'
import { Ethers } from '../../utils-local/types'
import { ERC721 } from '../../typechain-types'

export async function getERC721Token(address: Address, ethers: Ethers) {
  return (await ethers.getContractAt('ERC721', address)) as unknown as ERC721
}
