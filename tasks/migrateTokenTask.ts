import { BigNumber } from 'ethers'
import { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types'
import { Address } from '../models/Address'

interface MigrateTokenExpectationsMap {
  equalBalances: Address[],
  balances: { [address: string]: BigNumber }
}

export async function migrateTokenTask(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { fromNetwork, fromContract, fromAddress, toNetwork, toContract, toAddress, expectations: expectationsPath, dry } = args
  const { ethers, network } = hre
  console.info(`Migrating: ${fromContract} at ${fromAddress} -> ${toContract}`)

  // TODO: it must support BULL migration
  // TODO: it must support SHLD migration

  //  before SHLD
  // TODO: it must remove claim-related code
  // TODO: it must remove rollback-related code
  // TODO: it must distribute the remaining claims
  // TODO: Same as with SHLD, but without the vesting, and without the NFTrade smart contract

  // TODO: it must migrate SHLD
  // TODO: it must remove the bot protection (maybe we can trick the bots by redeploying the contract)
  // TODO: it must deploy COLI from [T-address]
  // TODO: it must distribute COLI to [deployer address] instead of 0x7dcbefb3b9a12b58af8759e0eb8df05656db911d
  // TODO: it must distribute COLI to addresses who are staking in the liquidity pools (Uniswap V3, Uniswap V2)
  // TODO: it must distribute COLI to addresses who are staking in NFTrade smart contract
  // TODO: it must maintain the vesting

  const $fromToken = await ethers.getContractFactory('BullToken')
  const fromToken = await $fromToken.attach(fromAddress)
  const expectations: MigrateTokenExpectationsMap = await import(`${process.cwd()}/${expectationsPath}`)

  // await rollbackBullToken(fromToken, from, to, poolAddresses, holderAddresses, expectations, ethers, dry, console.info.bind(console))
  if (dry) console.info('Dry run completed, no transactions were sent. Remove the \'--dry true\' flag to send transactions.')
}
