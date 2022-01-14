import { BigNumber } from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Address } from '../models/Address'
import { ensure } from '../util/ensure'
import { findDeployment } from '../data/allDeployments'
import { RunnableTaskArguments } from '../util/task'
import { Writable } from '../util/writable'
import { getRunnableContext, RunnableContext } from '../util/context'
import { Expected } from '../util/expectation'
import { ShieldToken } from '../typechain-types'
import { impl } from '../util/todo'
import { getContract } from '../util/ethers'
import { NetworkName } from '../models/NetworkName'

async function deployShieldToken(token: ShieldToken): Promise<ShieldToken> {
  throw impl()
}

async function setVesting(token: ShieldToken) {
  throw impl()
}

async function setBalances(token: ShieldToken) {
  throw impl()
}

export async function deployColiTokenTask(args: DeployColiTokenTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getDeployColiTokenContext(args, hre)
  const { fromNetwork, toNetwork, isPaused, expectations: expectationsPath, dry, ethers } = context
  if (!isPaused) throw new Error('Please pause the SHLD token before migrating')
  console.info('Migrating SHLD token')

  const fromDeployment = ensure(findDeployment({ token: 'SHLD', network: fromNetwork }))
  const fromToken = await getContract(ethers, 'ShieldToken', fromDeployment.address) as unknown as ShieldToken
  const toToken = await deployShieldToken(fromToken)
  // const pauseTx = await pauseContract(fromToken, true)
  const vestingTxes = await setVesting(toToken)
  const transferTxes = await setBalances(toToken)

  // TODO: it must migrate BULL
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

  const expectations: DeployColiExpectationsMap = await import(`${process.cwd()}/${expectationsPath}`)

  // await rollbackBullToken(fromToken, from, to, poolAddresses, holderAddresses, expectations, ethers, dry, console.info.bind(console))
  if (dry) console.info('Dry run completed, no transactions were sent. Remove the \'--dry true\' flag to send transactions.')
}

interface DeployColiExpectationsMap {
  equalBalances: Address[],
  balances: { [address: string]: BigNumber }
}

interface DeployColiTokenTaskArguments extends RunnableTaskArguments, Writable, Expected {
  fromNetwork: NetworkName
  toNetwork: NetworkName
  isPaused: boolean
}

export interface DeployColiTokenContext extends DeployColiTokenTaskArguments, RunnableContext {

}

export async function getDeployColiTokenContext(args: DeployColiTokenTaskArguments, hre: HardhatRuntimeEnvironment): Promise<DeployColiTokenContext> {
  return {
    ...args,
    ...await getRunnableContext(args, hre),
  }
}
