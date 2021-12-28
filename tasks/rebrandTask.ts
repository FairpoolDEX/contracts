import { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types'
import { impl } from '../util/todo'

async function setBullClaims() {
  throw impl()
}

async function migrateBullToken() {
  throw impl()
//   const network = 'mainnet'
//   const deployment = getDeploymentByNetwork(network)
//   return run("migrateToken", {
//     fromNetwork: deployment.network,
//     fromAddress: deployment.address,
//     fromContract: 'BullToken',
//     address: contract.address,
//     constructorArgs: constructorArgsModule,
//     constructorArgsParams,
//   })
//   await setBullClaims()
}

async function migrateShieldToken() {
  throw impl()
}

export async function rebrandTask(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { dry } = args
  const { ethers, network } = hre
  console.info('Rebranding')

  await migrateBullToken()
  await migrateShieldToken()

  // TODO: Same as with SHLD, but without the vesting, and without the NFTrade smart contract

  // TODO: it must migrate SHLD
  // TODO: it must remove the bot protection (maybe we can trick the bots by redeploying the contract)
  // TODO: it must deploy COLI from [T-address]
  // TODO: it must distribute COLI to [deployer address] instead of 0x7dcbefb3b9a12b58af8759e0eb8df05656db911d
  // TODO: it must distribute COLI to addresses who are staking in the liquidity pools (Uniswap V3, Uniswap V2)
  // TODO: it must distribute COLI to addresses who are staking in NFTrade smart contract
  // TODO: it must maintain the vesting

}
