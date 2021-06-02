import neatcsv from "neat-csv"
import fs from "fs"
import { map, fromPairs, shuffle } from "lodash"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import { utils, BigNumber } from "ethers"
import { Readable as ReadableStream } from "stream"
import { chunk } from "../test/support/all.helpers"
import { BullToken } from "../typechain/BullToken"
import { airdropRate, airdropStageShareDenominator, airdropStageShareNumerator } from "../test/support/BullToken.helpers"

type Balances = { [index: string]: BigNumber }

export async function parseAllBalancesCSV(newDatas: Array<string | Buffer | ReadableStream>, oldDatas: Array<string | Buffer | ReadableStream>): Promise<Balances> {
  const balances: Balances = {}
  for (let i = 0; i < newDatas.length; i++) {
    const _balances = await parseBalancesCSV(newDatas[i])
    for (const key of Object.keys(_balances)) {
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

export async function parseBalancesCSV(data: string | Buffer | ReadableStream): Promise<Balances> {
  const balances: Balances = {}
  const rows = await neatcsv(data)
  for (let i = 0; i < rows.length; i++) {
    balances[rows[i]["HolderAddress"].toLowerCase()] = utils.parseUnits(rows[i]["Balance"], 18)
  }
  return balances
}

export async function setClaims(token: BullToken, balances: Balances, log: ((msg: any) => void) | void): Promise<void> {
  // NOTE: shuffle is used to achieve a normal distribution of zero balances: since each zero balance would result in a gas refund, we will normalize the gas refund across multiple transactions
  const balancesArr = shuffle(Object.entries(balances))
  const balancesArrChunks = chunk(balancesArr, 400)
  // const transactions = []
  for (let i = 0; i < balancesArrChunks.length; i++) {
    const entries = balancesArrChunks[i]
    log && log(`Chunk ${i + 1} / ${balancesArrChunks.length}:`)
    log && log(fromPairs(entries))
    const addresses = map(entries, 0)
    const amounts = (map(entries, 1) as BigNumber[]).map((amount: BigNumber) => amount.mul(airdropStageShareNumerator).div(airdropStageShareDenominator).mul(airdropRate))
    const tx = await token.setClaims(addresses, amounts)
    log && log(`TX Hash: ${tx.hash}`)
  }
}

export async function setClaimsBullToken(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { token: tokenAddress, balances: balancesPath, extras: extrasPath, olds: oldsPath } = args
  console.log(`Reading balances from ${balancesPath} and ${extrasPath}`)
  const balances = await parseAllBalancesCSV([fs.readFileSync(balancesPath), fs.readFileSync(extrasPath)], [fs.readFileSync(oldsPath)])
  console.log(`Attaching to contract ${tokenAddress}`)
  const Token = await hre.ethers.getContractFactory("BullToken")
  const token = await Token.attach(tokenAddress) as BullToken
  console.log(`Setting claims`)
  await setClaims(token, balances, console.log.bind(console))
}
