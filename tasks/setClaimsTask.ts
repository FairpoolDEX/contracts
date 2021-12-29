import fs from 'fs'
import { shuffle } from 'lodash'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { BigNumber } from 'ethers'
import { chunk } from '../test/support/all.helpers'
import { airdropRate, airdropStageShareDenominator, airdropStageShareNumerator } from '../test/support/BullToken.helpers'
import { expect } from '../util/expect'
import { maxFeePerGas, maxPriorityFeePerGas } from '../util/gas'
import { BalanceBN, BalanceMap, getBalancesFromMap, parseBalancesCSV, sumBalances } from '../util/balance'
import { CSVData } from '../util/csv'
import { Logger } from '../util/log'
import { sumBigNumbers } from '../util/bignumber'
import { ContractName } from '../util/contract'
import { importExpectations } from '../util/expectation'
import { impl } from '../util/todo'
import { AddressTypeSchema } from '../models/AddressInfo'
import { getAddressType } from '../data/allAddressInfos'
import { rebrandDummyRunId, RunId } from '../util/run'
import { NetworkName, NetworkNameSchema } from '../models/Network'
import { Address } from '../models/Address'
import { ShieldTaskArguments } from '../util/task'
import { $zero } from '../data/allAddresses'

export interface RunnerContext {
  runId: RunId
  deployerAddress: Address
  networkName: NetworkName
  dry: boolean
  log: Logger
}

export async function getRunnerContext(args: ShieldTaskArguments, hre: HardhatRuntimeEnvironment): Promise<RunnerContext> {
  const { runId, dry } = args
  const { network, ethers } = hre
  const networkName = NetworkNameSchema.parse(network.name)
  const [deployer] = await ethers.getSigners()
  return {
    runId,
    networkName,
    deployerAddress: deployer.address,
    dry,
    log: console.info.bind(console),
  }
}

export async function setClaimsTask(args: SetClaimsTaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { contractName, contractAddress, nextfolder, prevfolder, retrofolder, blacklistfolder, expectations: expectationsPath, runId, dry } = args
  const { ethers } = hre
  const context = await getRunnerContext(args, hre)
  const nextfolderFiles = fs.readdirSync(nextfolder).map((filename) => fs.readFileSync(`${nextfolder}/${filename}`))
  const prevfolderFiles = fs.readdirSync(prevfolder).map((filename) => fs.readFileSync(`${prevfolder}/${filename}`))
  const retrofolderFiles = fs.readdirSync(retrofolder).map((filename) => fs.readFileSync(`${retrofolder}/${filename}`))
  const blacklistfolderFiles = fs.readdirSync(blacklistfolder).map((filename) => fs.readFileSync(`${blacklistfolder}/${filename}`))
  const expectations: SetClaimsExpectationsMap = await importExpectations(expectationsPath)
  console.info('Parsing balances')
  const balances = await parseAllBalancesCSV(nextfolderFiles, prevfolderFiles, retrofolderFiles, blacklistfolderFiles)
  console.info(`Attaching to contract ${contractAddress}`)
  const Token = await ethers.getContractFactory(contractName)
  const token = await Token.attach(contractAddress)
  console.info('Setting claims')
  await setClaims(token, balances, expectations, runId, 400, context)
  if (dry) console.info('Dry run completed, no transactions were sent. Remove the \'--dry true\' flag to send transactions.')
}

export async function setClaims(token: any, balanceMap: BalanceMap, expectations: SetClaimsExpectationsMap, runId: RunId, chunkSize = 325, context: RunnerContext): Promise<void> {
  // const { network } = hre
  // const blockGasLimits = { ropsten: 8000000, mainnet: 30000000 }
  // const blockGasLimit = network.name === "ropsten" || network.name === "mainnet" ? blockGasLimits[network.name] : null
  // if (!blockGasLimit) throw new Error("Undefined blockGasLimit")
  const { dry, log } = context
  for (const _address in expectations.balances) {
    const address = _address.toLowerCase()
    expect(balanceMap[address] || BigNumber.from('0'), `Address: ${address}`).to.equal(expectations.balances[_address])
  }
  // NOTE: shuffle is used to achieve a normal distribution of zero balances: since each zero balance would result in a gas refund, we will normalize the gas refund across multiple transactions
  const balances = optimizeForGasRefund(unwrapSmartContractBalances(context, getBalancesFromMap(balanceMap)))
  const balancesChunks = chunk(balances, chunkSize)
  const addresses = balances.map(b => b.address)
  const totalSHLDAmount = sumBalances(balances)
  let totalBULLAmount = BigNumber.from(0)
  log && log('CUR', totalSHLDAmount.toString())
  log && log('MAX', expectations.totalSHLDAmount.max.toString())
  expect(totalSHLDAmount.gt(expectations.totalSHLDAmount.min)).to.be.true
  expect(totalSHLDAmount.lt(expectations.totalSHLDAmount.max)).to.be.true
  // const transactions = []
  for (let i = 0; i < balancesChunks.length; i++) {
    const $balances = balancesChunks[i]
    const $balancesForDisplay = $balances.map(balance => [balance.address, balance.amount.toString()])
    log && log(`Chunk ${i + 1} / ${balancesChunks.length}:`)
    // log && log(fromPairs(entriesForDisplay))
    const addresses = $balances.map(b => b.address)
    const amounts = $balances.map(b => b.amount).map(amount => amount.mul(airdropStageShareNumerator).div(airdropStageShareDenominator).mul(airdropRate))
    totalBULLAmount = totalBULLAmount.add(sumBigNumbers(amounts))
    if (!dry) {
      const tx = await token.setClaims(addresses, amounts, { gasLimit: 8000000, maxFeePerGas, maxPriorityFeePerGas })
      log && log(`TX Hash: ${tx.hash}`)
    }
  }
  log && log('totalBULLAmount', totalBULLAmount.toString())
  log && log('BCUR', '1490403967926689867814673435496')
  log && log('BADD', totalBULLAmount.toString())
  log && log('BMIN', expectations.totalBULLAmount.min.toString())
  log && log('BMAX', expectations.totalBULLAmount.max.toString())
  expect(totalBULLAmount.gt(expectations.totalBULLAmount.min)).to.be.true
  expect(totalBULLAmount.lt(expectations.totalBULLAmount.max)).to.be.true
}

// export async function parseShieldBalancesCSV(data: CSVData) {
//   return rewriteBalanceMap(shieldRewriteAddressMap, await parseBalancesCSV(data))
// }

export async function parseAllBalancesCSV(nextDatas: CSVData[], prevDatas: CSVData[], retroDatas: CSVData[], blacklistDatas: CSVData[]): Promise<BalanceMap> {
  const balances: BalanceMap = {}
  // const address = '0xf5396ed020a765e561f4f176b1e1d622fb6d4154'.toLowerCase()
  for (let i = 0; i < nextDatas.length; i++) {
    const _balances = await parseBalancesCSV(nextDatas[i])
    for (const key of Object.keys(_balances)) {
      const _balance = _balances[key].mul(3)
      if (balances[key]) {
        balances[key] = balances[key].add(_balance)
      } else {
        balances[key] = _balance
      }
    }
  }
  for (let i = 0; i < retroDatas.length; i++) {
    const _balances = await parseBalancesCSV(retroDatas[i])
    for (const key of Object.keys(_balances)) {
      if (balances[key]) {
        balances[key] = balances[key].add(_balances[key])
      } else {
        balances[key] = _balances[key]
      }
    }
  }
  for (let i = 0; i < prevDatas.length; i++) {
    const _balances = await parseBalancesCSV(prevDatas[i])
    for (const key of Object.keys(_balances)) {
      if (!balances[key]) {
        balances[key] = BigNumber.from(0)
      }
    }
  }
  for (let i = 0; i < blacklistDatas.length; i++) {
    const _balances = await parseBalancesCSV(blacklistDatas[i])
    for (const key of Object.keys(_balances)) {
      balances[key] = BigNumber.from(0)
    }
  }
  return balances
}

export function optimizeForGasRefund(balances: BalanceBN[]) {
  return shuffle(balances)
}

/** NOTES
  * Some smart contracts are multisigs, so the user can, technically, move the tokens
    * But those smart contracts don't exist on another network
    * Allow manual claims?
    * Get contract owner -> Set claim for owner address?
  * Some smart contracts are "lockers"
    * Liquidity pools
    * NFTrade staking contract
  * Implement a function from locker smart contract address to locked user balances?
 */
function unwrapSmartContractBalances(context: RunnerContext, balances: BalanceBN[]): BalanceBN[] {
  const newBalances: BalanceBN[] = []
  return balances.reduce((newBalances: BalanceBN[], balance: BalanceBN) => newBalances.concat(unwrapSmartContractBalance(context, balance)), newBalances)
}

function unwrapSmartContractBalance(context: RunnerContext, balance: BalanceBN): BalanceBN {
  const { runId, deployerAddress, networkName } = context
  const type = getAddressType(networkName, balance.address)
  switch (type) {
    case AddressTypeSchema.enum.Human:
      return balance
    case AddressTypeSchema.enum.TeamFinanceLiquidityLocker:
      return { ...balance, address: deployerAddress }
    case AddressTypeSchema.enum.NFTrade:
      return runId === rebrandDummyRunId ? { ...balance, address: $zero } : balance
    default:
      throw impl()
  }
}

export interface SetClaimsExpectationsMap {
  balances: { [address: string]: BigNumber },
  totalSHLDAmount: { min: BigNumber, max: BigNumber },
  totalBULLAmount: { min: BigNumber, max: BigNumber },
}

interface SetClaimsTaskArguments extends ShieldTaskArguments {
  contractName: ContractName
  contractAddress: Address
  nextfolder: string
  prevfolder: string
  retrofolder: string
  blacklistfolder: string
  expectations: string
}
