import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { LogLevel } from '../../../util-local/ethers'
import { FairpoolTest } from '../../../typechain-types'

export async function deployFairpoolTest(owner: SignerWithAddress) {
  ethers.utils.Logger.setLogLevel(LogLevel.ERROR) // suppress "Duplicate definition" warnings
  const fairpoolTestFactory = await ethers.getContractFactory('FairpoolTest')
  return (await fairpoolTestFactory.connect(owner).deploy()) as unknown as FairpoolTest
}
