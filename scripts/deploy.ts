import { ethers, upgrades } from "hardhat"

import ALLOCATIONS from './allocations'


async function main() {
  const ShieldToken = await ethers.getContractFactory("ShieldToken")
  const token = await upgrades.deployProxy(ShieldToken)
  await token.deployed()

  console.log("Token address:", token.address) // eslint-disable-line no-console

  for (const vestingTypeIndex of Object.keys(ALLOCATIONS)) {
    const addresses = Object.keys(ALLOCATIONS[vestingTypeIndex])
    const amounts = Object.values(ALLOCATIONS[vestingTypeIndex])
    await token.addAllocations(addresses, amounts, vestingTypeIndex)

    console.log(`Added allocation of type ${vestingTypeIndex} for ${addresses.length} addresses`) // eslint-disable-line no-console
  }

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error) // eslint-disable-line no-console
    process.exit(1)
  })
