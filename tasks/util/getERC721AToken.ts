import { Address } from '../../models/Address'
import { Ethers } from '../../util-local/types'
import { ERC721A } from '../../typechain-types'

export async function getERC721AToken(address: Address, ethers: Ethers) {
  return (await ethers.getContractAt('ERC721A', address)) as unknown as ERC721A
}
