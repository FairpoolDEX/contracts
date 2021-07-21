import neatcsv from "neat-csv"
import fs from "fs"
import { strict as assert } from "assert"
import { map, fromPairs, shuffle, trimEnd } from "lodash"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import { utils, BigNumber } from "ethers"
import { Readable as ReadableStream } from "stream"
import { chunk } from "../test/support/all.helpers"
import { airdropRate, airdropStageShareDenominator, airdropStageShareNumerator } from "../test/support/BullToken.helpers"
import { BalanceMap } from "../types"

export async function parseAllBalancesCSV(newDatas: Array<string | Buffer | ReadableStream>, oldDatas: Array<string | Buffer | ReadableStream>): Promise<BalanceMap> {
  const balances: BalanceMap = {}
  // const address = '0xf5396ed020a765e561f4f176b1e1d622fb6d4154'.toLowerCase()
  for (let i = 0; i < newDatas.length; i++) {
    const _balances = await parseBalancesCSV(newDatas[i])
    for (const key of Object.keys(_balances)) {
      // if (key === address) console.log("new _balances[key]", _balances[key].toString())
      if (balances[key]) {
        balances[key] = balances[key].add(_balances[key])
      } else {
        balances[key] = _balances[key]
      }
    }
  }
  for (let i = 0; i < oldDatas.length; i++) {
    const _balances = await parseBalancesCSV(oldDatas[i])
    for (const key of Object.keys(_balances)) {
      if (!balances[key]) {
        balances[key] = BigNumber.from(0)
      }
    }
  }
  return balances
}

export async function parseBalancesCSV(data: string | Buffer | ReadableStream): Promise<BalanceMap> {
  const balances: BalanceMap = {}
  const rows = await neatcsv(data)
  for (let i = 0; i < rows.length; i++) {
    const addressRaw = rows[i]["HolderAddress"]
    const amountRaw = rows[i]["Balance"]
    const addressParsed = addressRaw.toLowerCase()
    const amountParsed = utils.parseUnits(amountRaw, 18)
    assert.equal(trimEnd(utils.formatUnits(amountParsed, 18), '0'), trimEnd(amountRaw, '0'), "Can't parse balance")
    balances[addressParsed] = amountParsed
  }
  return balances
}

export async function setClaims(token: any, balances: BalanceMap, dry = false, log: ((msg: any) => void) | undefined = undefined): Promise<void> {
  // NOTE: shuffle is used to achieve a normal distribution of zero balances: since each zero balance would result in a gas refund, we will normalize the gas refund across multiple transactions
  const balancesArr = shuffle(Object.entries(balances))
  const balancesArrChunks = chunk(balancesArr, 325)
  // const transactions = []
  for (let i = 0; i < balancesArrChunks.length; i++) {
    const entries = balancesArrChunks[i]
    const entriesForDisplay = balancesArrChunks[i].map(([address, amount]) => [address, amount.toString()])
    log && log(`Chunk ${i + 1} / ${balancesArrChunks.length}:`)
    log && log(fromPairs(entriesForDisplay))
    const addresses = map(entries, 0)
    const amounts = (map(entries, 1) as BigNumber[]).map((amount: BigNumber) => amount.mul(airdropStageShareNumerator).div(airdropStageShareDenominator).mul(airdropRate))
    if (!dry) {
      const tx = await token.setClaims(addresses, amounts)
      log && log(`TX Hash: ${tx.hash}`)
    }
  }
}

export async function setClaimsBullToken(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { token: tokenAddress, oldfolder: oldFolder, newfolder: newFolder, dry } = args
  const oldFolderFiles = fs.readdirSync(oldFolder).map((filename) => fs.readFileSync(`${oldFolder}/${filename}`))
  const newFolderFiles = fs.readdirSync(newFolder).map((filename) => fs.readFileSync(`${newFolder}/${filename}`))
  console.info(`Parsing balances`)
  const balances = await parseAllBalancesCSV(newFolderFiles, oldFolderFiles)
  console.info(`Attaching to contract ${tokenAddress}`)
  const Token = await hre.ethers.getContractFactory("BullToken")
  const token = await Token.attach(tokenAddress)
  console.info(`Setting claims`)
  await setClaims(token, balances, dry, console.info.bind(console))
  if (dry) console.info(`Dry run completed, no transactions were sent. Remove the '--dry true' flag to send transactions.`)
}
