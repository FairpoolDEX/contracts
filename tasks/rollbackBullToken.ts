import os from "os"
import fs from "fs"
import { chain, map, max } from "lodash"
import type { ethers } from "ethers"
import neatcsv from "neat-csv"
import dotenv from "dotenv"
import Etherscan from "etherscan-api"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/types"
import { fromTokenAmount, getUniswapV2PairContractFactory } from "../test/support/all.helpers"
import { Address, Addresses, Amount, BalanceMap, Ethers } from "../types"
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

export async function rollbackBullToken(token: Contract, from: BlockTag, to: BlockTag, poolAddresses: Addresses, holderAddresses: Addresses, expectations: ExpectationsMap, ethers: Ethers, dry = false, info: ((msg: any) => void) | void): Promise<void> {
  const transfers = await getTransfers(token, from, to)
  expect(chain(transfers).map("blockNumber").min().value()).greaterThan(from)
  expect(chain(transfers).map("blockNumber").max().value()).lessThan(to)
  expect(transfers.length).to.equal(expectations.transfers.length)
  const transfersR = transfers.slice(0).reverse()
  const transfersRF = await getFlaggedTransfers(transfersR, poolAddresses)
  expect(transfersRF.filter(t => t.type === "move").length).greaterThan(0)
  expect(transfersRF.filter(t => t.type === "buy").length).equal(expectations.buys.length)
  expect(transfersRF.filter(t => t.type === "sell").length).equal(expectations.sells.length)
  const burnAddresses = []
  const mintAddresses = []
  const amounts = []
  for (const transfer of transfersR) {
    amounts.push(transfer.amount)
    burnAddresses.push(transfer.to)
    mintAddresses.push(transfer.from)
  }
  console.info("Flagged events:")
  console.table(transfersRF.map((t) => Object.assign({}, t, { amount: fromTokenAmount(t.amount) })))
  if (!dry) {
    info && info(`Sending rollbackManyTx`)
    const rollbackManyTx = await token.rollbackMany(burnAddresses, mintAddresses, amounts) as ContractTransaction
    info && info(`Awaiting rollbackManyTx: ${rollbackManyTx.hash}`)
    await rollbackManyTx.wait(3)

    info && info(`Sending syncTxes`)
    const syncTxes = await Promise.all(poolAddresses.map(async (pa) => {
      const pairFactory = (await getUniswapV2PairContractFactory(ethers))
      const pairContract = pairFactory.attach(pa)
      return await pairContract.sync() as ContractTransaction
    }))
    info && info(`Awaiting syncTxes: ${syncTxes.map((tx) => tx.hash).join(",")}`)
    await Promise.all(syncTxes.map((tx: ContractTransaction) => tx.wait(3)))

    info && info(`Checking expectations`)
    await expectBalancesAreEqual(token, from, "latest", holderAddresses)

    info && info(`Sending disableRollbackManyTx`)
    const disableRollbackManyTx = await token.disableRollbackMany()
    info && info(`Awaiting disableRollbackManyTx: ${rollbackManyTx.hash}`)
    await disableRollbackManyTx.wait(3)
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

  // const etherscan = Etherscan.init(process.env.ETHERSCAN_API_KEY, network)
  // var balance = api.account.balance("0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae")
  // balance.then(function(balanceData) {
  //   console.log(balanceData)
  // })
  console.info(`Rolling back the token`)
  await rollbackBullToken(token, from, to, poolAddresses, holderAddresses, expectations, ethers, dry, console.info.bind(console))
}

