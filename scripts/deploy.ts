import { ethers, upgrades } from "hardhat"
import { getImplementationAddress } from '@openzeppelin/upgrades-core'

import { ALLOCATIONS, RELEASE_TIME } from './parameters.test'


async function main() {
  const [deployer] = await ethers.getSigners()
  console.log(`export DEPLOYER=${deployer.address}`)

  const Token = await ethers.getContractFactory("ShieldToken")
  const token = await upgrades.deployProxy(Token, [RELEASE_TIME])
  await token.deployed()
  console.log(`export PROXY_ADDRESS=${token.address}`) // eslint-disable-line no-console

  const implementationAddress = await getImplementationAddress(ethers.provider, token.address)
  console.log(`export IMPLEMENTATION_ADDRESS=${implementationAddress}`) // eslint-disable-line no-console

  // add allocations
  // for (const [vestingTypeIndex, allocation] of Object.entries(ALLOCATIONS)) {
  //   const addresses = Object.keys(allocation)
  //   const amounts = Object.values(allocation)
  //   await token.addAllocations(addresses, amounts, vestingTypeIndex)

  //   console.log(`Vesting "${vestingTypeIndex}": added for ${addresses.length} addresses`) // eslint-disable-line no-console
  // }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error) // eslint-disable-line no-console
    process.exit(1)
  })
