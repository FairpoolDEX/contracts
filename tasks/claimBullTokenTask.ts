import fs from 'fs'
import { strict as assert } from 'assert'
import { uniq } from 'lodash'
import neatcsv from 'neat-csv'
import { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types'
import type { Ethers } from '../util/types'
import { Contract } from 'ethers'
import { Address, validateAddress } from '../models/Address'

export async function claimBullTokenTask(args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> {
  const { token: tokenAddress, claimer: claimerAddress, claims: claimsPath } = args
  const { ethers } = hre
  const [signer] = await ethers.getSigners()
  assert.equal(signer.address.toLowerCase(), claimerAddress.toLowerCase())
  console.info(`[INFO] Claiming with ${signer.address}`)
  console.info(`[INFO] Reading addresses from ${claimsPath}`)
  const addresses = await parseAddresses(fs.readFileSync(claimsPath))
  console.info(`[INFO] Attaching to contract ${tokenAddress}`)
  const Token = await ethers.getContractFactory('BullToken')
  const token = await Token.attach(tokenAddress)
  console.info('[INFO] Claiming $BULL')
  await claimBullToken(token, addresses, ethers, console.info.bind(console))
}

export async function claimBullToken(token: Contract, addresses: Address[], ethers: Ethers, info: ((msg: any) => void) | void): Promise<void> {
  if (addresses.length > 300) {
    throw new Error('Can\'t claim if addresses array is longer than 300 elements')
  }
  const tx = await token.claimMany(addresses)
  info && info(`[INFO] TX hash: ${tx.hash}`)
}

export async function parseAddresses(data: Buffer | string): Promise<Address[]> {
  const rows = await neatcsv(data)
  return uniq(rows.map((row) => validateAddress(row['Address'])))
}
