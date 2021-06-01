import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import { utils, BigNumber } from "ethers"
import neatcsv from "neat-csv"
import fs from "fs"
import { Readable as ReadableStream } from "stream"
import { fromTokenAmount, toTokenAmount } from "../test/support/all.helpers"

type Balances = Array<{ address: string, amount: BigNumber }>

export async function parseBalancesCSV(data: string | Buffer | ReadableStream): Promise<Balances> {
  return (await neatcsv(data)).map((row) => {
    console.log("row", row)
    return { address: row[0], amount: toTokenAmount(row[1]) }
  })
}

export async function setClaimsBullToken(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const data = parseBalancesCSV(fs.createReadStream(args.claims))
  // chunk holders

  // const allocations: Allocations = (await import(args.allocations)).default
  // const address = args.token
  //
  // console.log(`Attaching to contract ${address}...`)
  //
  // const Token = await hre.ethers.getContractFactory("ShieldToken")
  // const token = await Token.attach(address)
  //
  // for (const [vestingTypeIndex, allocation] of Object.entries(allocations)) {
  //   if (!vestingTypeIndex) {
  //     continue
  //   }
  //
  //   const addresses = Object.keys(allocation)
  //   const amounts = Object.values(allocation)
  //   console.log(`Calling addAllocations with "${vestingTypeIndex}" vesting type for ${addresses.length} addresses...`) // eslint-disable-line no-console
  //   console.log(allocation)
  //   const tx = await token.addAllocations(addresses, amounts, vestingTypeIndex, { gasLimit: 8000000 })
  //   console.log(`TX Hash: ${tx.hash}\n\n`)
  // }
}
