import fs from "fs"
import { uniq } from "lodash"
import type { ethers } from "ethers"
import neatcsv from "neat-csv"
import Etherscan from "etherscan-api"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/types"
import { fromTokenAmount, getUniswapV2PairContractFactory } from "../test/support/all.helpers"
import { Address, Addresses, Amount, BalanceMap, Ethers } from "../types"
import { BigNumber, Contract, utils } from "ethers"
import { expect } from "../util/expect"
import { BullToken } from "../typechain"
import { ContractTransaction } from "@ethersproject/contracts"
import { BlockTag } from "@ethersproject/abstract-provider/src.ts/index"

type Transfer = {
  from: Address,
  to: Address,
  amount: BigNumber
}

type FlaggedTransfer = Transfer & {
  type: FlaggedTransferType
}

type FlaggedTransferType = "move" | "buy" | "sell"

export async function getTransfers(token: Contract, from: BlockTag, to: BlockTag): Promise<Array<Transfer>> {
  const TransferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" // ERC-20 Transfer event topic
  const transfersRaw = await token.queryFilter({ topics: [TransferTopic] }, from, to)
  return transfersRaw.map((e) => {
    if (!e.args) throw new Error()
    const transfer = {
      from: e.args.from,
      to: e.args.to,
      amount: e.args.value,
    }
    return transfer
  })
}

export async function getFlaggedTransfers(transfers: Transfer[], poolAddresses: string[]): Promise<Array<FlaggedTransfer>> {
  return transfers.map((t) => {
    let type: FlaggedTransferType = "move"
    if (t.from in poolAddresses) {
      type = "buy"
    }
    if (t.to in poolAddresses) {
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

export async function rollbackBullToken(token: Contract, from: BlockTag, to: BlockTag, poolAddresses: Addresses, holderAddresses: Addresses, ethers: Ethers, dry = false, info: ((msg: any) => void) | void): Promise<void> {
  const transfers = await getTransfers(token, from, to)
  const transfersR = transfers.slice(0).reverse()
  const transfersRF = await getFlaggedTransfers(transfersR, poolAddresses)
  const burnAddresses = []
  const mintAddresses = []
  const amounts = []
  for (const transfer of transfersR) {
    amounts.push(transfer.amount)
    burnAddresses.push(transfer.to)
    mintAddresses.push(transfer.from)
  }
  console.info("Flagged events:")
  console.table(transfersRF)
  const { moves, buys, sells } = await splitFlaggedTransfers(transfersRF)
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
    await expectBalancesAreEqual(token, from, to, holderAddresses)

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
  const { token: tokenAddress, pools: poolAddressesString, holders: holderAddressesPath, from, to, dry } = args
  const { ethers, network } = hre
  console.info(`Attaching to contract ${tokenAddress}`)
  const Token = await ethers.getContractFactory("BullToken")
  const token = await Token.attach(tokenAddress)
  const poolAddresses: Addresses = poolAddressesString.split(",")
  const holderAddressesFile = fs.readFileSync(holderAddressesPath)
  const holderAddresses: Addresses = (await neatcsv(holderAddressesFile)).map((row) => row["HolderAddress"])

  // const etherscan = Etherscan.init(process.env.ETHERSCAN_API_KEY, network)
  // var balance = api.account.balance("0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae")
  // balance.then(function(balanceData) {
  //   console.log(balanceData)
  // })
  console.info(`Rolling back the token`)
  await rollbackBullToken(token, from, to, poolAddresses, holderAddresses, ethers, dry, console.info.bind(console))
}

