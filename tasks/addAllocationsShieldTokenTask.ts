import { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types'
import { StringAllocations } from '../util-local/types'

export async function addAllocationsShieldTokenTask(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const allocations: StringAllocations = (await import(args.allocations)).default
  const address = args.token

  console.log(`Attaching to contract ${address}...`)

  const Token = await hre.ethers.getContractFactory('ShieldToken')
  const token = await Token.attach(address)

  for (const [vestingTypeIndex, allocation] of Object.entries(allocations)) {
    if (!vestingTypeIndex) {
      continue
    }

    const addresses = Object.keys(allocation)
    const amounts = Object.values(allocation)
    console.log(`Calling addAllocations with "${vestingTypeIndex}" vesting type for ${addresses.length} addresses...`) // eslint-disable-line no-console
    console.log(allocation)
    const tx = await token.addAllocations(addresses, amounts, vestingTypeIndex, { gasLimit: 8000000 })
    console.log(`TX Hash: ${tx.hash}\n\n`)
  }
}
