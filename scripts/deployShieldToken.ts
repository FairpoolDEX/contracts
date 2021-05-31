import { ethers, upgrades } from "hardhat"
import { getImplementationAddress } from '@openzeppelin/upgrades-core'

import { SHIELD_RELEASE_TIME } from '../test/support/ShieldToken.helpers'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log(`export DEPLOYER=${deployer.address}`)

  const Token = await ethers.getContractFactory("ShieldToken")
  const token = await upgrades.deployProxy(Token, [SHIELD_RELEASE_TIME])
  await token.deployed()
  console.log(`export PROXY_ADDRESS=${token.address}`) // eslint-disable-line no-console

  const implementationAddress = await getImplementationAddress(ethers.provider, token.address)
  console.log(`export IMPLEMENTATION_ADDRESS=${implementationAddress}`) // eslint-disable-line no-console
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error) // eslint-disable-line no-console
    process.exit(1)
  })
