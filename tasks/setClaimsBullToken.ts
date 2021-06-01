import { map, find } from "lodash"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import { utils, BigNumber, BigNumberish } from "ethers"
import neatcsv from "neat-csv"
import fs from "fs"
import { Readable as ReadableStream } from "stream"
import { chunk } from "../test/support/all.helpers"
import { BullToken } from "../typechain/BullToken"

type Balances = Array<{ address: string, amount: BigNumber }>

export async function parseAllBalancesCSV(datas: Array<string | Buffer | ReadableStream>): Promise<Balances> {
  const balances = await parseBalancesCSV(datas[0])
  for (let i = 1; i < datas.length; i++) {
    const _balances = await parseBalancesCSV(datas[i])
    for (let j = 0; j < _balances.length; j++) {
      const balance = find(balances, { address: _balances[j].address })
      if (balance) {
        balance.amount = balance.amount.add(_balances[j].amount)
      } else {
        balances.push(_balances[j])
      }
    }
  }
  return balances
}

export async function parseBalancesCSV(data: string | Buffer | ReadableStream): Promise<Balances> {
  return (await neatcsv(data)).map((row) => {
    return { address: row["HolderAddress"].toLowerCase(), amount: utils.parseUnits(row["Balance"], 18) }
  })
}

export async function setClaims(token: BullToken, balances: Balances, log: (msg: any) => void): Promise<void> {
  const balancesChunks = chunk(balances, 100)
  // const transactions = []
  for (let i = 0; i < balancesChunks.length; i++) {
    log(`Chunk ${i + 1} / ${balancesChunks.length}:`)
    log(balancesChunks[i])
    const addresses = map(balancesChunks[i], "address")
    const amounts = (map(balancesChunks[i], "amount") as BigNumber[]).map((amount: BigNumber) => amount.mul(10000))
    const func = i === 0 ? "setClaims" : "addClaims"
    const tx = await token[func](addresses, amounts)
    log(`TX Hash: ${tx.hash}`)
  }
}

export async function setClaimsBullToken(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { token: tokenAddress, balances: balancesPath, extras: extrasPath } = args
  console.log(`Reading balances from ${balancesPath} and ${extrasPath}`)
  const balances = await parseAllBalancesCSV([fs.createReadStream(balancesPath), fs.createReadStream(extrasPath)])
  console.log(`Attaching to contract ${tokenAddress}`)
  const Token = await hre.ethers.getContractFactory("BullToken")
  const token = await Token.attach(tokenAddress) as BullToken
  console.log(`Setting claims`)
  await setClaims(token, balances, console.log.bind(console))
}
