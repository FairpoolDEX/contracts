import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ensure } from '../util/ensure'
import { findDeployment } from '../data/allDeployments'
import { RunnableTaskArguments } from '../util/task'
import { Writable } from '../util/writable'
import { getRunnableContext, RunnableContext } from '../util/context'
import { Expected, importExpectations } from '../util/expectation'
import { ColiToken } from '../typechain-types'
import { impl } from '../util/todo'
import { getContract } from '../util/ethers'
import { isTestnet, NetworkName } from '../models/NetworkName'
import { readFile, realpath } from 'fs/promises'
import { BalanceBN } from '../models/BalanceBN'
import { DeployGenericTokenTaskOutput } from './deployContractTask'
import { Allocation } from '../models/Allocation'
import { Filename } from '../util/filesystem'
import { parseAllocationsCSV } from '../models/Allocation/parseAllocationsCSV'
import { flatten, uniq } from 'lodash'
import { VestingType } from '../models/VestingType'
import { findVestingSchedule } from '../data/allVestingSchedules'
import { getOverrides } from '../util/network'
import { expect } from '../util/expect'
import { FrozenWallet } from '../models/FrozenWallet'
import { expectFrozenWalletsOnToken } from '../models/FrozenWallet/expectFrozenWalletsOnToken'
import { expectBalancesOnToken } from '../util/expectBalancesOnToken'

export async function deployColiTokenTask(args: DeployColiTokenTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const context = await getDeployColiTokenContext(args, hre)
  const { fromNetwork, isPaused, expectations: expectationsPath, dry, networkName: toNetwork, ethers } = context
  if (!(isPaused || isTestnet(toNetwork))) throw new Error('Please pause the ShieldToken contract before migrating to non-testnet network')

  const fromDeployment = ensure(findDeployment({ contract: 'ShieldToken', network: fromNetwork }))
  const fromToken = await getContract(ethers, 'ColiToken', fromDeployment.address) as unknown as ColiToken
  const toToken = await deployColiToken(context)
  // const pauseTx = await pauseContract(fromToken, true)
  const allocationTxes = await setAllocations(await getAllocations(context), toToken)
  const balanceTxes = await setBalances(fromToken, toToken)

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

  const expectations: DeployColiTokenExpectationsMap = await importExpectations(expectationsPath)
  await expectDeployColiToken(expectations, toToken)

  // await rollbackBullToken(fromToken, from, to, poolAddresses, holderAddresses, expectations, ethers, dry, console.info.bind(console))
  if (dry) console.info('Dry run completed, no transactions were sent. Remove the \'--dry true\' flag to send transactions.')
}

async function expectDeployColiToken(expectations: DeployColiTokenExpectationsMap, token: ColiToken) {
  await expectBalancesOnToken(token, expectations.balances)
  await expectFrozenWalletsOnToken(token, expectations.frozenWallets)
}

async function deployColiToken(context: DeployColiTokenContext): Promise<ColiToken> {
  const { ethers, run } = context
  const constructorArgsModule = await realpath(`${__dirname}/arguments/ColiToken.arguments.ts`)
  const result = await run('deployContract', {
    contract: 'ColiToken',
    constructorArgsModule,
    upgradeable: true,
  }) as DeployGenericTokenTaskOutput
  if (result.upgradeable) {
    return await getContract(ethers, 'ColiToken', result.proxyAddress) as unknown as ColiToken
  } else {
    throw new Error()
  }
}

async function getAllocations(context: DeployColiTokenContext) {
  const data = await readFile(context.allocations)
  return parseAllocationsCSV(data)
}

async function setAllocations(allocations: Allocation[], token: ColiToken) {
  const types = uniq<VestingType>(allocations.map(a => a.type))
  const groupedTxes = await Promise.all(types.map(async (type) => {
    const allocationsByType = allocations.filter(a => a.type === type)
    const addresses = allocationsByType.map(a => a.address)
    const amounts = allocationsByType.map(a => a.amount)
    const schedule = ensure(findVestingSchedule({ type }))
    const index = ensure(schedule.smartContractIndex)
    const tx = await token.addAllocations(addresses, amounts, index, await getOverrides(token.signer))
  }))
  return flatten(groupedTxes)
}

async function setBalances(fromToken: ColiToken, toToken: ColiToken) {
  throw impl()
}

export interface DeployColiTokenExpectationsMap {
  balances: BalanceBN[]
  frozenWallets: FrozenWallet[]
}

export function validateDeployColiTokenExpectationsMap(map: DeployColiTokenExpectationsMap) {
  expect(map, 'totalSupply is fully minted in initialize() -> expectation will always pass').not.to.have.key('totalSupply')
  return map
}

interface DeployColiTokenTaskArguments extends RunnableTaskArguments, Writable, Expected {
  fromNetwork: NetworkName
  isPaused: boolean
  allocations: Filename
}

export interface DeployColiTokenContext extends DeployColiTokenTaskArguments, RunnableContext {
  allocations: Filename
}

export async function getDeployColiTokenContext(args: DeployColiTokenTaskArguments, hre: HardhatRuntimeEnvironment): Promise<DeployColiTokenContext> {
  return {
    ...args,
    ...await getRunnableContext(args, hre),
  }
}
