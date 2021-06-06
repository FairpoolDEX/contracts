import fs from "fs"
import { without } from "lodash"
import type { ethers } from "ethers"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import { BullToken } from "../typechain"
import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/types"

export type Key = string;
export type Keys = Key[];
type Ethers = typeof ethers & HardhatEthersHelpers;

export async function parseKeys(data: Buffer | string): Promise<Keys> {
  return without(data.toString().split("\n"), '')
}

export async function claimBullToken(token: BullToken, keys: Keys, ethers: Ethers, log: ((msg: any) => void) | void): Promise<void> {
  for (const key of keys) {
    const wallet = new ethers.Wallet(Buffer.from(key, "hex"))
    const signer = wallet.connect(ethers.provider)
    const address = await signer.getAddress()
    const tokenWithSinger = token.connect(signer)
    const amountToClaim = await tokenWithSinger.claims(address)
    const signerToString = `Address ${address} (private key ${key.slice(0, 4)}...)`
    if (amountToClaim.isZero()) {
      log && log(`[WARN] ${signerToString} doesn't have any $BULL to claim - skipping`)
      continue
    }
    log && log(`[INFO] ${signerToString} has ${amountToClaim} $BULL to claim - sending TX`)
    const tx = await tokenWithSinger.claim()
    log && log(`[INFO] ${signerToString} claim TX: ${tx.hash}`)
  }
}

export async function claimBullTokenTask(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { token: tokenAddress, keys: keysPath } = args
  const { ethers } = hre
  console.log(`[INFO] Reading private keys from ${keysPath}`)
  const keys = await parseKeys(fs.readFileSync(keysPath))
  console.log(`[INFO] Attaching to contract ${tokenAddress}`)
  const Token = await ethers.getContractFactory("BullToken") as unknown as BullToken
  const token = await Token.attach(tokenAddress)
  console.log(`[INFO] Claiming $BULL`)
  await claimBullToken(token, keys, ethers, console.log.bind(console))
}
