import fs from "fs"
import { without } from "lodash"
import type { ethers } from "ethers"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/types"

export type Address = string;
export type Addresses = Address[];
type Ethers = typeof ethers & HardhatEthersHelpers;

export async function parseAddresses(data: Buffer | string): Promise<Addresses> {
  return without(data.toString().split("\n"), '')
}

export async function claimBullToken(token: any, addresses: Addresses, ethers: Ethers, log: ((msg: any) => void) | void): Promise<void> {
  if (addresses.length > 300) {
    throw new Error(`Can't claim if addresses array is longer than 300 elements`)
  }
  const tx = await token.claimMany(addresses)
  log && log(`[INFO] TX hash: ${tx.hash}`)
}

export async function claimBullTokenTask(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { token: tokenAddress, addresses: addressesPath } = args
  const { ethers } = hre
  console.log(`[INFO] Reading addresses from ${addressesPath}`)
  const addresses = await parseAddresses(fs.readFileSync(addressesPath))
  console.log(`[INFO] Attaching to contract ${tokenAddress}`)
  const Token = await ethers.getContractFactory("BullToken")
  const token = await Token.attach(tokenAddress)
  console.log(`[INFO] Claiming $BULL`)
  await claimBullToken(token, addresses, ethers, console.log.bind(console))
}
