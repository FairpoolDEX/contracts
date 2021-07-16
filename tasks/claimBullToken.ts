import fs from "fs"
import { strict as assert } from "assert"
import { uniq } from "lodash"
import neatcsv from "neat-csv"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/types"
import type { Addresses, Ethers } from "../types"

export async function parseAddresses(data: Buffer | string): Promise<Addresses> {
  const rows = await neatcsv(data)
  return uniq(rows.map((row) => row["Address"].toLowerCase()))
}

export async function claimBullToken(token: any, addresses: Addresses, ethers: Ethers, info: ((msg: any) => void) | void): Promise<void> {
  if (addresses.length > 300) {
    throw new Error(`Can't claim if addresses array is longer than 300 elements`)
  }
  const tx = await token.claimMany(addresses)
  info && info(`[INFO] TX hash: ${tx.hash}`)
}

export async function claimBullTokenTask(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { token: tokenAddress, claimer: claimerAddress, claims: claimsPath } = args
  const { ethers } = hre
  const [signer] = await ethers.getSigners()
  assert.equal(signer.address.toLowerCase(), claimerAddress.toLowerCase())
  console.info(`[INFO] Claiming with ${signer.address}`)
  console.info(`[INFO] Reading addresses from ${claimsPath}`)
  const addresses = await parseAddresses(fs.readFileSync(claimsPath))
  console.info(`[INFO] Attaching to contract ${tokenAddress}`)
  const Token = await ethers.getContractFactory("BullToken")
  const token = await Token.attach(tokenAddress)
  console.info(`[INFO] Claiming $BULL`)
  await claimBullToken(token, addresses, ethers, console.info.bind(console))
}
