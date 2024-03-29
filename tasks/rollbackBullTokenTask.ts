import fs from 'fs'
import { map, max, min, sortBy } from 'lodash'
import { Contract } from 'ethers'
import neatcsv from 'neat-csv'
import { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types'
import { mineBlocks, toTokenAmount } from '../test/support/all.helpers'
import { Ethers } from '../utils-local/types'
import { expect } from '../utils-local/expect'
import { ContractTransaction } from '@ethersproject/contracts'
import { BlockTag } from '@ethersproject/abstract-provider/src.ts/index'
import { rollbackDate } from '../test/support/rollback.helpers'
import { importExpectations } from '../utils-local/expectation'
import { Address } from '../models/Address'
import { getTransfersPaginatedCached } from './util/getTransfers'
import { Transfer as Tr } from '../models/Transfer'
import { expectBalancesAreEqual } from '../models/BalanceBN/expectBalancesAreEqual'
import { createFsCache } from '../utils/cache'
import { Logger } from '../utils-local/log'

type FlaggedTransfer = Tr & {
  type: FlaggedTransferType
}

type FlaggedTransferType = 'move' | 'buy' | 'sell'

export interface RollbackBullTokenExpectationsMap {
  transfers: EtherscanTransfer[]
  buys: { length: number }
  sells: { length: number }
  balances: { [address: string]: string }
}

export type EtherscanTransfer = unknown // Event

export async function getFlaggedTransfers(transfers: Tr[], poolAddresses: Address[]): Promise<Array<FlaggedTransfer>> {
  return transfers.map((t) => {
    let type: FlaggedTransferType = 'move'
    if (poolAddresses.includes(t.from)) {
      type = 'buy'
    }
    if (poolAddresses.includes(t.to)) {
      type = 'sell'
    }
    return Object.assign({}, t, { type })
  })
}

export async function splitFlaggedTransfers(flaggedTransfers: FlaggedTransfer[]): Promise<{ moves: FlaggedTransfer[], buys: FlaggedTransfer[], sells: FlaggedTransfer[] }> {
  return {
    moves: flaggedTransfers.filter((ft) => ft.type === 'move'),
    buys: flaggedTransfers.filter((ft) => ft.type === 'buy'),
    sells: flaggedTransfers.filter((ft) => ft.type === 'sell'),
  }
}

export async function rollbackBullToken(token: Contract, from: BlockTag, to: BlockTag, poolAddresses: Address[], holderAddresses: Address[], expectations: RollbackBullTokenExpectationsMap, ethers: Ethers, dry = false, info: Logger): Promise<void> {
  const cache = createFsCache()
  const transfers = await getTransfersPaginatedCached(token, from, to, cache)
  const blockNumbers = map(transfers, 'blockNumber')
  expect(min(blockNumbers)).greaterThan(from)
  expect(max(blockNumbers)).lessThan(to)
  expect(blockNumbers).to.deep.equal(sortBy(blockNumbers))
  expect(transfers.length).to.equal(expectations.transfers.length)
  const transfersR = transfers.slice(0).reverse()
  const transfersRF = await getFlaggedTransfers(transfersR, poolAddresses)
  const moves = transfersRF.filter(t => t.type === 'move')
  const buys = transfersRF.filter(t => t.type === 'buy')
  const sells = transfersRF.filter(t => t.type === 'sell')
  const buyers = buys.map(t => t.to)
  const sellers = sells.map(t => t.from)
  expect(moves.length).greaterThan(0)
  expect(buys.length).equal(expectations.buys.length)
  expect(sells.length).equal(expectations.sells.length)
  // if (info) info('buyers')
  // if (info) buyers.forEach(b => console.info(b))
  // if (info) info('sellers')
  // if (info) sellers.forEach(s => console.info(s))
  const burnAddresses = []
  const mintAddresses = []
  const amounts = []
  for (const transfer of transfersR) {
    amounts.push(transfer.amount)
    burnAddresses.push(transfer.to)
    mintAddresses.push(transfer.from)
  }
  // console.info("Flagged events:")
  // console.table(transfersRF.map((t) => Object.assign({}, t, { amount: fromTokenAmount(t.amount) })))
  {
    const minConfirmations = 3

    // const irrevertableTransferReports = []
    // for (let i = 0; i < transfersR.length; i++) {
    //   // if (burnAddresses[i] === '0x0000000000000000000000000000000000000000') continue
    //   const amount = amounts[i]
    //   const burnBalance = await token.balanceOf(burnAddresses[i])
    //   const mintBalance = await token.balanceOf(mintAddresses[i])
    //   if (amount.gt(burnBalance)) {
    //     irrevertableTransferReports.push({
    //       transfer: transfersR[i],
    //       amount: fromTokenAmount(amount),
    //       burnBalance: fromTokenAmount(burnBalance),
    //     })
    //   }
    // }
    // console.log('irrevertableTransferReports', irrevertableTransferReports)
    // console.log('irrevertableTransferReports.length', irrevertableTransferReports.length)
    // throw new Error()

    const step = 1000
    for (let i = 0; i < transfersR.length; i += step) {
      if (info) info(`Sending rollbackManyTx ${i / step}`)
      const tx = await token.rollbackMany(burnAddresses.slice(i, i + step), mintAddresses.slice(i, i + step), amounts.slice(i, i + step), { gasLimit: 2500000 }) as ContractTransaction
      if (info) info(`Awaiting rollbackManyTx ${i / step}`)
      await mineBlocks(minConfirmations, ethers)
      await tx.wait(minConfirmations)
    }

    const { getUniswapV2PairContractFactory } = await import('../test/support/Uniswap.helpers')

    for (let i = 0; i < poolAddresses.length; i++) {
      if (info) info(`Sending syncTx ${i} to ${poolAddresses[i]}`)
      const pairFactory = (await getUniswapV2PairContractFactory(ethers))
      const pairContract = pairFactory.attach(poolAddresses[i])
      const tx = await pairContract.sync() as ContractTransaction
      if (info) info(`Awaiting syncTx ${i} to ${poolAddresses[i]}`)
      await mineBlocks(minConfirmations, ethers)
      await tx.wait(minConfirmations)
    }

    if (info) info('Checking expectations')
    await expectBalancesMatchExpectations(token, expectations)
    await expectBalancesAreEqual(token, from, 'latest', holderAddresses)

    if (info) info('Sending disableRollbackManyTx')
    const finishRollbackManyTx = await token.finishRollbackMany()
    if (info) info(`Awaiting finishRollbackManyTx: ${finishRollbackManyTx.hash}`)
    await mineBlocks(minConfirmations, ethers)
    await finishRollbackManyTx.wait(minConfirmations)

    // NOTE: unpauseTx not needed since finishRollbackMany runs _unpause()
    // if (info) info(`Sending unpauseTx`)
    // const unpauseTx = await token.pause(false)
    // if (info) info(`Awaiting unpauseTx: ${unpauseTx.hash}`)
    // await mineBlocks(minConfirmations, ethers)
    // await unpauseTx.wait(minConfirmations)
  }
}

export async function expectBalancesMatchExpectations(token: Contract, expectations: RollbackBullTokenExpectationsMap) {
  for (const address in expectations.balances) {
    const actualBalance = await token.balanceOf(address)
    expect(actualBalance).to.equal(toTokenAmount(expectations.balances[address]))
  }
}

export async function rollbackBullTokenTask(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { token: tokenAddress, from, to, pools: poolAddressesString, holders: holderAddressesPath, expectations: expectationsPath, dry } = args
  const { ethers } = hre
  console.info(`Attaching to contract ${tokenAddress}`)
  const Token = await ethers.getContractFactory('BullToken')
  const token = await Token.attach(tokenAddress)
  const poolAddresses: Address[] = poolAddressesString.split(',')
  const holderAddressesFile = fs.readFileSync(holderAddressesPath)
  const holderAddresses: Address[] = (await neatcsv(holderAddressesFile)).map((row) => row['HolderAddress'])
  const expectations: RollbackBullTokenExpectationsMap = await importExpectations(expectationsPath)
  const provider = ethers.provider
  // console.log('provider', provider)
  // console.log('ethers.provider', ethers.provider)
  const fromBlock = await provider.getBlock(from)
  const toBlock = await provider.getBlock(to)
  expect(fromBlock.timestamp * 1000).to.be.lt(rollbackDate.getTime())
  expect(toBlock.timestamp * 1000).to.be.gt(rollbackDate.getTime())

  const net = await ethers.provider.getNetwork()
  if (net.chainId === 31337) {
    const snapshot = await ethers.provider.send('evm_snapshot', [])
    process.on('SIGINT', async function () {
      await ethers.provider.send('evm_revert', [snapshot])
    })
  }

  // const etherscan = Etherscan.init(process.env.ETHERSCAN_API_KEY, network)
  // var balance = api.account.balance("0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae")
  // balance.then(function(balanceData) {
  //   console.log(balanceData)
  // })
  console.info('Rolling back the token')
  await rollbackBullToken(token, from, to, poolAddresses, holderAddresses, expectations, ethers, dry, console.info.bind(console))
  if (dry) console.info('Dry run completed, no transactions were sent. Remove the \'--dry true\' flag to send transactions.')
}
