import os from "os"
import fs from "fs"
import { chain, map, min, max, sortBy } from "lodash"
import type { ethers } from "ethers"
import neatcsv from "neat-csv"
import dotenv from "dotenv"
import Etherscan from "etherscan-api"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/types"
import { fromTokenAmount, mineBlocks, toTokenAmount } from "../test/support/all.helpers"
import { Address, Addresses, Amount, BalanceMap, Ethers } from "../util/types"
import { BigNumber, Contract, utils } from "ethers"
import { expect } from "../util/expect"
import { ContractTransaction } from "@ethersproject/contracts"
import { BlockTag } from "@ethersproject/abstract-provider/src.ts/index"
import { rollbackDate } from "../test/support/rollback.helpers"

type Transfer = {
  from: Address,
  to: Address,
  amount: BigNumber
}

type FlaggedTransfer = Transfer & {
  type: FlaggedTransferType
}

type FlaggedTransferType = "move" | "buy" | "sell"

interface ExpectationsMap {
  transfers: EtherscanTransfer[]
  buys: { length: number }
  sells: { length: number }
  balances: { [address: string]: string }
}

interface EtherscanTransfer {
  address: string,
  blockNumber: string
  // ... more fields available
}

export async function getTransfers(token: Contract, from: BlockTag, to: BlockTag): Promise<Array<Transfer>> {
  const TransferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" // ERC-20 Transfer event topic
  const transfersRaw = await token.queryFilter({ topics: [TransferTopic] }, from, to)
  return transfersRaw.map((e) => {
    if (!e.args) throw new Error()
    // if (e.args.from === "0x59B8c20CA527ff18e2515b68F28939d6dD3E867B") {
    //   console.log("e", e)
    // }
    const transfer = {
      from: e.args.from,
      to: e.args.to,
      amount: e.args.value,
      blockNumber: e.blockNumber,
      transactionHash: e.transactionHash,
    }
    return transfer
  })
}

export async function getFlaggedTransfers(transfers: Transfer[], poolAddresses: Address[]): Promise<Array<FlaggedTransfer>> {
  return transfers.map((t) => {
    let type: FlaggedTransferType = "move"
    if (poolAddresses.includes(t.from)) {
      type = "buy"
    }
    if (poolAddresses.includes(t.to)) {
      type = "sell"
    }
    return Object.assign({}, t, { type })
  })
}

export async function splitFlaggedTransfers(flaggedTransfers: FlaggedTransfer[]): Promise<{ moves: FlaggedTransfer[], buys: FlaggedTransfer[], sells: FlaggedTransfer[] }> {
  return {
    moves: flaggedTransfers.filter((ft) => ft.type === "move"),
    buys: flaggedTransfers.filter((ft) => ft.type === "buy"),
    sells: flaggedTransfers.filter((ft) => ft.type === "sell"),
  }
}

export async function rollbackBullToken(token: Contract, from: BlockTag, to: BlockTag, poolAddresses: Addresses, holderAddresses: Addresses, expectations: ExpectationsMap, ethers: Ethers, dry = false, info: ((...msg: any) => void) | void): Promise<void> {
  const transfers = await getTransfers(token, from, to)
  const blockNumbers = map(transfers, "blockNumber")
  expect(min(blockNumbers)).greaterThan(from)
  expect(max(blockNumbers)).lessThan(to)
  expect(blockNumbers).to.deep.equal(sortBy(blockNumbers))
  expect(transfers.length).to.equal(expectations.transfers.length)
  const transfersR = transfers.slice(0).reverse()
  const transfersRF = await getFlaggedTransfers(transfersR, poolAddresses)
  const moves = transfersRF.filter(t => t.type === "move")
  const buys = transfersRF.filter(t => t.type === "buy")
  const sells = transfersRF.filter(t => t.type === "sell")
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
  if (!dry) {
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

    const { getUniswapV2PairContractFactory } = await import("../test/support/Uniswap.helpers")

    for (let i = 0; i < poolAddresses.length; i++) {
      if (info) info(`Sending syncTx ${i} to ${poolAddresses[i]}`)
      const pairFactory = (await getUniswapV2PairContractFactory(ethers))
      const pairContract = pairFactory.attach(poolAddresses[i])
      const tx = await pairContract.sync() as ContractTransaction
      if (info) info(`Awaiting syncTx ${i} to ${poolAddresses[i]}`)
      await mineBlocks(minConfirmations, ethers)
      await tx.wait(minConfirmations)
    }

    if (info) info(`Checking expectations`)
    await expectBalancesMatchExpectations(token, expectations)
    await expectBalancesAreEqual(token, from, "latest", holderAddresses)

    if (info) info(`Sending disableRollbackManyTx`)
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

export async function expectBalancesMatchExpectations(token: Contract, expectations: ExpectationsMap) {
  for (const address in expectations.balances) {
    const actualBalance = await token.balanceOf(address)
    expect(actualBalance).to.equal(toTokenAmount(expectations.balances[address]))
  }
}

export async function expectBalancesAreEqual(token: Contract, from: BlockTag, to: BlockTag, holderAddresses: Addresses) {
  const balancesBeforeAirdrop = await getBalancesAt(token, from, holderAddresses)
  const balancesAfterRollback = await getBalancesAt(token, to, holderAddresses)
  expect(balancesBeforeAirdrop).to.deep.equal(balancesAfterRollback)
}

async function getBalancesAt(token: Contract, blockTag: BlockTag, holderAddresses: Addresses): Promise<Amount[]> {
  return Promise.all(holderAddresses.map((address) => token.balanceOf(address, { blockTag })))
}

export async function rollbackBullTokenTask(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { token: tokenAddress, from, to, pools: poolAddressesString, holders: holderAddressesPath, expectations: expectationsPath, dry } = args
  const { ethers, network } = hre
  console.info(`Attaching to contract ${tokenAddress}`)
  const Token = await ethers.getContractFactory("BullToken")
  const token = await Token.attach(tokenAddress)
  const poolAddresses: Addresses = poolAddressesString.split(",")
  const holderAddressesFile = fs.readFileSync(holderAddressesPath)
  const holderAddresses: Addresses = (await neatcsv(holderAddressesFile)).map((row) => row["HolderAddress"])
  const expectations: ExpectationsMap = await import(`${process.cwd()}/${expectationsPath}`)
  const provider = ethers.provider
  // console.log('provider', provider)
  // console.log('ethers.provider', ethers.provider)
  const fromBlock = await provider.getBlock(from)
  const toBlock = await provider.getBlock(to)
  expect(fromBlock.timestamp * 1000).to.be.lt(rollbackDate.getTime())
  expect(toBlock.timestamp * 1000).to.be.gt(rollbackDate.getTime())

  const net = await ethers.provider.getNetwork()
  if (net.chainId === 31337) {
    const snapshot = await ethers.provider.send("evm_snapshot", [])
    process.on("SIGINT", async function() {
      await ethers.provider.send("evm_revert", [snapshot])
    })
  }

  // const etherscan = Etherscan.init(process.env.ETHERSCAN_API_KEY, network)
  // var balance = api.account.balance("0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae")
  // balance.then(function(balanceData) {
  //   console.log(balanceData)
  // })
  console.info(`Rolling back the token`)
  await rollbackBullToken(token, from, to, poolAddresses, holderAddresses, expectations, ethers, dry, console.info.bind(console))
  if (dry) console.info(`Dry run completed, no transactions were sent. Remove the '--dry true' flag to send transactions.`)
}

