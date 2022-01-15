import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Address } from '../models/Address'
import { ensure } from '../util/ensure'
import { findDeployment } from '../data/allDeployments'
import { RunnableTaskArguments } from '../util/task'
import { Writable } from '../util/writable'
import { getRunnableContext, RunnableContext } from '../util/context'
import { Expected } from '../util/expectation'
import { ColiToken } from '../typechain-types'
import { impl } from '../util/todo'
import { getContract } from '../util/ethers'
import { isTestnet, NetworkName } from '../models/NetworkName'
import { realpath } from 'fs/promises'
import { BalanceBN } from '../models/BalanceBN'

export async function deployColiTokenTask(args: DeployColiTokenTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getDeployColiTokenContext(args, hre)
  const { fromNetwork, toNetwork, isPaused, expectations: expectationsPath, dry, ethers } = context
  if (!(isPaused || isTestnet(toNetwork))) throw new Error('Please pause the ShieldToken contract before migrating to non-testnet network')

  const fromDeployment = ensure(findDeployment({ contract: 'ShieldToken', network: fromNetwork }))
  const fromToken = await getContract(ethers, 'ColiToken', fromDeployment.address) as unknown as ColiToken
  const toToken = await deployColiToken(context)
  // const pauseTx = await pauseContract(fromToken, true)
  const vestingTxes = await setVesting(fromToken, toToken)
  const transferTxes = await setBalances(fromToken, toToken)

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

async function deployColiToken(context: DeployColiTokenContext): Promise<ColiToken> {
  const { run } = context
  const result = await run('deployContract', {
    contract: 'ColiToken',
    constructorArgsModule: await realpath(`${__dirname}/arguments/ColiToken.arguments.ts`),
    upgradeable: true,
  })
}

async function setVesting(fromToken: ColiToken, toToken: ColiToken) {
  throw impl()
}

async function setBalances(fromToken: ColiToken, toToken: ColiToken) {
  throw impl()
}

export interface DeployColiExpectationsMap {
  equalBalances: Address[],
  balances: BalanceBN[]
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
